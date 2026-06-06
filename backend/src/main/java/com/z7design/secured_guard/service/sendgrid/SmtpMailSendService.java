package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.config.MailBranding;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.SmtpSettings;
import com.z7design.secured_guard.repository.SmtpSettingsRepository;
import com.z7design.secured_guard.service.EncryptionService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

/**
 * Envia e-mails via SMTP configurável (Gmail, Office365, AWS SES, etc.).
 *
 * <p>Diferente do SendGrid, aqui a configuração mora no banco
 * ({@link SmtpSettings}) e pode mudar em runtime via UI. Por isso o
 * {@link JavaMailSender} é criado <em>on demand</em> a cada chamada — o
 * custo é desprezível e evita ter que reiniciar a aplicação após salvar
 * uma nova configuração.</p>
 */
@Service
@RequiredArgsConstructor
public class SmtpMailSendService {

    private static final Logger LOG = LoggerFactory.getLogger(SmtpMailSendService.class);

    private final SmtpSettingsRepository smtpSettingsRepository;
    private final EncryptionService encryptionService;
    private final MailBranding mailBranding;

    /**
     * Envia um e-mail HTML usando a configuração SMTP ativa.
     *
     * @return o {@code Message-ID} gerado pelo servidor SMTP (pode ser {@code null}).
     * @throws IllegalStateException se não houver configuração SMTP ativa.
     * @throws MessagingException     se o servidor recusar a mensagem.
     */
    public String sendHtml(EmailLog emailLog,
                           String toEmail,
                           String toName,
                           String subject,
                           String htmlBody) throws MessagingException, MailException {
        return sendHtml(emailLog, toEmail, toName, subject, htmlBody, Collections.emptyList(), null);
    }

    /**
     * Envia HTML com imagens embutidas (CID), ex.: logomarca e banner de marketing.
     */
    public String sendHtml(EmailLog emailLog,
                           String toEmail,
                           String toName,
                           String subject,
                           String htmlBody,
                           List<EmailInlineImage> inlineImages) throws MessagingException, MailException {
        return sendHtml(emailLog, toEmail, toName, subject, htmlBody, inlineImages, null);
    }

    /**
     * Envia HTML com imagens embutidas e, quando informado, com cabeçalhos de
     * descadastro exigidos pelo Google ({@code List-Unsubscribe} e
     * {@code List-Unsubscribe-Post: List-Unsubscribe=One-Click}).
     *
     * @param unsubscribeUrl URL pública HTTPS de descadastro (one-click). Quando
     *                       {@code null}, em branco ou {@code "#"}, os cabeçalhos
     *                       não são adicionados.
     */
    public String sendHtml(EmailLog emailLog,
                           String toEmail,
                           String toName,
                           String subject,
                           String htmlBody,
                           List<EmailInlineImage> inlineImages,
                           String unsubscribeUrl) throws MessagingException, MailException {
        SmtpSettings cfg = smtpSettingsRepository.findFirstByIsActiveTrueOrderByUpdatedAtDesc()
                .orElseThrow(() -> new IllegalStateException(
                        "Nenhuma configuração SMTP ativa. Configure em Marketing → SMTP."));

        boolean multipart = inlineImages != null && !inlineImages.isEmpty();
        JavaMailSender sender = build(cfg);
        MimeMessage mime = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, multipart, StandardCharsets.UTF_8.name());

        // From
        try {
            helper.setFrom(new InternetAddress(cfg.getFromEmail(),
                    cfg.getFromName() != null ? cfg.getFromName() : ""));
        } catch (java.io.UnsupportedEncodingException e) {
            // Fallback: from sem nome legível.
            helper.setFrom(cfg.getFromEmail());
        }

        // To
        if (toName != null && !toName.isBlank()) {
            try {
                helper.setTo(new InternetAddress(toEmail, toName));
            } catch (java.io.UnsupportedEncodingException e) {
                helper.setTo(toEmail);
            }
        } else {
            helper.setTo(toEmail);
        }

        helper.setSubject(subject != null ? subject : "");
        helper.setText(htmlBody, true);

        if (multipart && inlineImages != null) {
            for (EmailInlineImage img : inlineImages) {
                if (img == null || img.contentId() == null || img.contentId().isBlank()
                        || img.data() == null || img.data().length == 0) {
                    continue;
                }
                String mimeType = img.mimeType() != null && !img.mimeType().isBlank()
                        ? img.mimeType() : "image/png";
                helper.addInline(img.contentId(), new ByteArrayResource(img.data()), mimeType);
            }
        }

        // Cabeçalhos de descadastro exigidos pelo Google para remetentes em
        // volume: List-Unsubscribe (HTTPS one-click + mailto) e
        // List-Unsubscribe-Post habilitando o botão de cancelamento do Gmail.
        if (unsubscribeUrl != null && !unsubscribeUrl.isBlank() && !"#".equals(unsubscribeUrl)
                && unsubscribeUrl.startsWith("https://")) {
            String mailtoUnsub = "mailto:" + cfg.getFromEmail() + "?subject=unsubscribe";
            mime.setHeader("List-Unsubscribe", "<" + unsubscribeUrl + ">, <" + mailtoUnsub + ">");
            mime.setHeader("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
        }

        // Carimba o emailLogId no Message-ID para correlacionar com tracking
        // (mesma estratégia do SendGrid via custom-arg). O domínio precisa ser o
        // do remetente para não disparar filtros anti-spam do Gmail.
        String localId = emailLog != null && emailLog.getId() != null
                ? emailLog.getId().toString()
                : UUID.randomUUID().toString();
        String messageId = "<" + localId + "@" + senderDomain(cfg) + ">";
        mime.setHeader("Message-ID", messageId);

        sender.send(mime);
        return messageId.replace("<", "").replace(">", "");
    }

    /**
     * Envia um e-mail de teste a partir de uma configuração arbitrária
     * (mesmo que não esteja salva no banco), retornando o erro encontrado
     * sem propagar exceção — usado pela tela de configuração.
     */
    public Optional<String> sendTestEmail(SmtpSettings cfg, String to, String subject, String body) {
        try {
            JavaMailSender sender = build(cfg);
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
            helper.setFrom(cfg.getFromEmail());
            helper.setTo(to);
            String brand = mailBranding.getBrandName();
            helper.setSubject(subject != null && !subject.isBlank()
                    ? subject : mailBranding.prefixSubject("Teste de configuração SMTP"));
            helper.setText(body != null && !body.isBlank()
                    ? body
                    : "<p>Olá!</p><p>Este é um e-mail de teste enviado para validar suas configurações "
                            + "SMTP no <strong>" + brand + "</strong>.</p>", true);
            sender.send(mime);
            return Optional.empty();
        } catch (Exception e) {
            LOG.warn("Falha no teste SMTP host={}:{} user={}: {}",
                    cfg.getHost(), cfg.getPort(), cfg.getUsername(), e.getMessage());
            return Optional.of(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
    }

    /**
     * Extrai o domínio do e-mail remetente para compor um {@code Message-ID}
     * válido. Cai para o host SMTP e, por fim, para um valor seguro.
     */
    private static String senderDomain(SmtpSettings cfg) {
        String from = cfg.getFromEmail();
        if (from != null) {
            int at = from.lastIndexOf('@');
            if (at >= 0 && at < from.length() - 1) {
                return from.substring(at + 1).trim().toLowerCase();
            }
        }
        if (cfg.getHost() != null && !cfg.getHost().isBlank()) {
            return cfg.getHost().trim().toLowerCase().replaceFirst("^smtp\\.", "");
        }
        return "promovervigilancia.com.br";
    }

    private JavaMailSender build(SmtpSettings cfg) {
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(cfg.getHost());
        impl.setPort(cfg.getPort() != null ? cfg.getPort() : 587);
        if (cfg.getUsername() != null && !cfg.getUsername().isBlank()) {
            impl.setUsername(cfg.getUsername());
        }
        if (cfg.getPasswordEnc() != null && !cfg.getPasswordEnc().isBlank()) {
            try {
                impl.setPassword(encryptionService.decryptPassword(cfg.getPasswordEnc()));
            } catch (RuntimeException e) {
                throw new IllegalStateException(
                        "Não foi possível descriptografar a senha SMTP. Reconfigure a senha.", e);
            }
        }

        Properties props = impl.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", cfg.getUsername() != null && !cfg.getUsername().isBlank() ? "true" : "false");
        boolean tls = Boolean.TRUE.equals(cfg.getUseTls());
        props.put("mail.smtp.starttls.enable", String.valueOf(tls));
        if (tls) props.put("mail.smtp.starttls.required", "true");
        // SSL implícito (porta 465) — algumas provedoras exigem.
        if (Integer.valueOf(465).equals(cfg.getPort())) {
            props.put("mail.smtp.ssl.enable", "true");
        }
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        return impl;
    }
}
