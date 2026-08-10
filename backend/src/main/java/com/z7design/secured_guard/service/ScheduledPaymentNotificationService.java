package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.ScheduledPayment;
import com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService;
import com.z7design.secured_guard.service.whatsapp.WhatsAppPhoneUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Envio assíncrono de notificações de cancelamento de pagamento agendado ao cliente.
 *
 * <p>O {@link Async} garante execução em thread separada (pool do Spring, habilitado via
 * {@code @EnableAsync}): o envio de e-mail/WhatsApp nunca atrasa a resposta do endpoint
 * que dispara o cancelamento (ex.: DELETE da conta a receber de origem).</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledPaymentNotificationService {

    private final EmailService emailService;
    private final WhatsAppAgentService whatsAppAgentService;

    /**
     * Dados essenciais da notificação de cancelamento, capturados dentro da transação
     * (lazy loading seguro) para que o envio assíncrono não dependa de contexto de persistência.
     */
    public record CancellationNotice(String clienteNome, String descricao, String valor, String dataAgendada,
                                     String fatura, String email, String telefoneNormalizado) {

        public static CancellationNotice from(ScheduledPayment payment) {
            Client client = payment.getClient();
            String clienteNome = client != null && client.getName() != null ? client.getName() : "Cliente";
            String descricao = (payment.getDescription() != null && !payment.getDescription().isBlank())
                    ? payment.getDescription() : "pagamento agendado";
            String valor = payment.getAmount() != null
                    ? NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(payment.getAmount())
                    : "não informado";
            String dataAgendada = payment.getScheduledDate() != null
                    ? payment.getScheduledDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    : "não definida";
            String fatura = (payment.getInvoiceNumber() != null && !payment.getInvoiceNumber().isBlank())
                    ? payment.getInvoiceNumber() : null;

            String email = client != null ? firstNonBlank(client.getEmail(), client.getContactEmail()) : null;
            String telefone = client != null ? firstNonBlank(client.getPhone(), client.getContactPhone()) : null;
            String telefoneNormalizado = null;
            if (telefone != null) {
                String normalized = WhatsAppPhoneUtil.normalize(telefone);
                if (!normalized.isEmpty()) {
                    telefoneNormalizado = normalized;
                }
            }
            return new CancellationNotice(clienteNome, descricao, valor, dataAgendada, fatura,
                    email, telefoneNormalizado);
        }

        private static String firstNonBlank(String primary, String fallback) {
            if (primary != null && !primary.isBlank()) {
                return primary;
            }
            return (fallback != null && !fallback.isBlank()) ? fallback : null;
        }
    }

    /**
     * Envia a notificação (e-mail e WhatsApp, best-effort) ao cliente informando que o
     * agendamento de pagamento foi cancelado por exclusão da conta a receber de origem.
     * Executado de forma assíncrona; falhas de envio são apenas logadas — nunca
     * interrompem a exclusão da conta a receber.
     */
    @Async
    public void sendCancellationNotice(CancellationNotice notice) {
        // 1) E-mail (e-mail principal do cliente, com fallback para e-mail de contato)
        if (notice.email() != null) {
            try {
                String subject = "Pagamento agendado cancelado — " + notice.clienteNome();
                String html = buildCancellationEmailHtml(notice.clienteNome(), notice.descricao(),
                        notice.valor(), notice.dataAgendada(), notice.fatura());
                boolean sent = emailService.sendEmail(notice.email(), subject, html);
                if (sent) {
                    log.info("E-mail de cancelamento enviado para {} (cliente {})", notice.email(), notice.clienteNome());
                } else {
                    log.warn("E-mail de cancelamento falhou para {} (cliente {})", notice.email(), notice.clienteNome());
                }
            } catch (Exception e) {
                log.error("Erro ao enviar e-mail de cancelamento para {}: {}", notice.email(), e.getMessage());
            }
        } else {
            log.info("Cliente {} sem e-mail cadastrado — notificação por e-mail não enviada.", notice.clienteNome());
        }

        // 2) WhatsApp (telefone principal do cliente, com fallback para telefone de contato)
        if (notice.telefoneNormalizado() != null) {
            try {
                String mensagem = "Olá, " + notice.clienteNome() + "! Informamos que o "
                        + notice.descricao() + " no valor de " + notice.valor()
                        + " (agendado para " + notice.dataAgendada() + ")"
                        + " foi CANCELADO, pois a conta a receber de origem foi removida do sistema."
                        + " Em caso de dúvidas, entre em contato conosco.";
                boolean sent = whatsAppAgentService.sendTextMessage(notice.telefoneNormalizado(), mensagem);
                if (sent) {
                    log.info("WhatsApp de cancelamento enviado para {} (cliente {})",
                            notice.telefoneNormalizado(), notice.clienteNome());
                } else {
                    log.warn("WhatsApp de cancelamento falhou para {} (cliente {})",
                            notice.telefoneNormalizado(), notice.clienteNome());
                }
            } catch (Exception e) {
                log.error("Erro ao enviar WhatsApp de cancelamento para {}: {}",
                        notice.telefoneNormalizado(), e.getMessage());
            }
        } else {
            log.info("Cliente {} sem telefone cadastrado — notificação por WhatsApp não enviada.", notice.clienteNome());
        }
    }

    private static String buildCancellationEmailHtml(String clienteNome, String descricao, String valor,
                                                     String dataAgendada, String fatura) {
        StringBuilder html = new StringBuilder();
        html.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.5;\">");
        html.append("<h2 style=\"color:#b00020;margin-bottom:4px;\">Pagamento agendado cancelado</h2>");
        html.append("<p>Olá, <strong>").append(escapeHtml(clienteNome)).append("</strong>!</p>");
        html.append("<p>Informamos que o agendamento abaixo foi <strong>cancelado</strong>, pois a conta a receber de origem foi removida do sistema:</p>");
        html.append("<table style=\"border-collapse:collapse;margin:12px 0;font-size:14px;\">");
        html.append("<tr><td style=\"padding:4px 12px 4px 0;color:#666;\">Descrição</td><td style=\"padding:4px 0;font-weight:bold;\">").append(escapeHtml(descricao)).append("</td></tr>");
        html.append("<tr><td style=\"padding:4px 12px 4px 0;color:#666;\">Valor</td><td style=\"padding:4px 0;font-weight:bold;\">").append(escapeHtml(valor)).append("</td></tr>");
        html.append("<tr><td style=\"padding:4px 12px 4px 0;color:#666;\">Data agendada</td><td style=\"padding:4px 0;font-weight:bold;\">").append(escapeHtml(dataAgendada)).append("</td></tr>");
        if (fatura != null) {
            html.append("<tr><td style=\"padding:4px 12px 4px 0;color:#666;\">Nº da fatura</td><td style=\"padding:4px 0;font-weight:bold;\">").append(escapeHtml(fatura)).append("</td></tr>");
        }
        html.append("</table>");
        html.append("<p style=\"color:#888;font-size:12px;\">Em caso de dúvidas, entre em contato conosco. Este é um e-mail automático, não responda.</p>");
        html.append("</div>");
        return html.toString();
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
