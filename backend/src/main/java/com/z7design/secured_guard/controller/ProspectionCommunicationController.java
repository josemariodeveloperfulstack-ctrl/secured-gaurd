package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.EmailService;
import com.z7design.secured_guard.service.prospection.ProspectionContactQualifier;
import com.z7design.secured_guard.service.prospection.ProspectionSenderEmailService;
import com.z7design.secured_guard.service.sendgrid.EmailMarketingRejectionService;
import com.z7design.secured_guard.service.sendgrid.EmailUnsubscribeService;
import com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Envio de mensagens aos prospectos usando os canais do próprio usuário:
 * WhatsApp conectado no dispositivo (QR Code) e e-mail informado por ele.
 */
@RestController
@RequestMapping("/api/prospection/communications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Prospecção - Comunicação", description = "Envio de WhatsApp e e-mail de apresentação aos prospectos")
public class ProspectionCommunicationController {

    private final WhatsAppAgentService whatsAppAgentService;
    private final EmailService emailService;
    private final EmailUnsubscribeService unsubscribeService;
    private final EmailMarketingRejectionService rejectionService;
    private final ProspectionSenderEmailService senderEmailService;
    private final UserRepository userRepository;

    @GetMapping("/status")
    @PreAuthorize(ProspectionController.PROSPECTION_AUTHORITY)
    @Operation(summary = "Status do WhatsApp conectado e do e-mail de envio do usuário")
    public ResponseEntity<Map<String, Object>> status(
            @AuthenticationPrincipal UserDetails userDetails) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("whatsappConnected", whatsAppAgentService.isAnyConnected());
        response.put("connectionState", whatsAppAgentService.getActiveConnectionState());
        response.put("serviceAvailable", whatsAppAgentService.isAnyServiceAvailable());
        response.put("providers", whatsAppAgentService.getProvidersStatus());
        response.put("senderEmail", resolveSenderEmail(userDetails));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sender-email")
    @PreAuthorize(ProspectionController.PROSPECTION_AUTHORITY)
    @Operation(summary = "Retorna o e-mail informado pelo usuário para envio de apresentação")
    public ResponseEntity<Map<String, Object>> getSenderEmail(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(Map.of("senderEmail", resolveSenderEmail(userDetails) != null
                ? resolveSenderEmail(userDetails) : ""));
    }

    @PutMapping("/sender-email")
    @PreAuthorize(ProspectionController.PROSPECTION_AUTHORITY)
    @Operation(summary = "Salva o e-mail informado pelo usuário para envio de apresentação")
    public ResponseEntity<Map<String, Object>> saveSenderEmail(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = username(userDetails);
        String saved = senderEmailService.save(username, request.get("email"));
        return ResponseEntity.ok(Map.of("senderEmail", saved));
    }

    @PostMapping("/whatsapp")
    @PreAuthorize(ProspectionController.PROSPECTION_AUTHORITY)
    @Operation(summary = "Envia mensagem de apresentação pelo WhatsApp conectado no dispositivo do usuário")
    public ResponseEntity<Map<String, Object>> sendWhatsApp(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = ProspectionContactQualifier.normalizeWhatsapp(request.get("to"));
        if (phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "WhatsApp inválido. Informe um celular brasileiro com DDD (ex.: (34) 99999-9999).");
        }

        String name = text(request.get("name"));
        String company = text(request.get("company"));
        String message = text(request.get("message"));
        if (message == null || message.isBlank()) {
            message = buildDefaultWhatsAppMessage(name, company, resolveSenderName(userDetails));
        }

        boolean sent = whatsAppAgentService.sendTextMessage(phone, message);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", sent);
        response.put("to", phone);
        whatsAppAgentService.getLastSuccessfulProvider()
                .ifPresent(provider -> response.put("provider", provider.name()));
        if (!sent) {
            response.put("error", whatsAppAgentService.getLastErrorMessage() != null
                    ? whatsAppAgentService.getLastErrorMessage()
                    : "WhatsApp não conectado. Conecte o WhatsApp em Conexão WhatsApp e tente novamente.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/email")
    @PreAuthorize(ProspectionController.PROSPECTION_AUTHORITY)
    @Operation(summary = "Envia e-mail de apresentação da empresa usando o e-mail informado pelo usuário")
    public ResponseEntity<Map<String, Object>> sendPresentationEmail(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String to = ProspectionContactQualifier.normalizeEmail(request.get("to"));
        if (to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail destinatário inválido.");
        }
        if (unsubscribeService.isUnsubscribed(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Este destinatário cancelou o recebimento de e-mails de marketing.");
        }
        if (rejectionService.isRejected(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Este destinatário rejeitou e-mails anteriores e não deve ser contactado.");
        }

        String sender = ProspectionContactQualifier.normalizeEmail(request.get("senderEmail"));
        if (sender == null) {
            sender = resolveSenderEmail(userDetails);
        }
        if (sender == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe seu e-mail de envio na configuração da prospecção.");
        }

        String name = text(request.get("name"));
        String company = text(request.get("company"));
        String customMessage = text(request.get("message"));
        String subject = text(request.get("subject"));
        if (subject == null || subject.isBlank()) {
            subject = "Apresentação Promover / Secured Guard"
                    + (company != null ? " - " + company : "");
        }

        String html = buildPresentationHtml(name, company, customMessage, sender,
                resolveSenderName(userDetails));
        boolean sent = emailService.sendEmailWithReplyTo(to, sender, subject, html);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", sent);
        response.put("to", to);
        response.put("replyTo", sender);
        if (!sent) {
            response.put("error", "Falha ao enviar e-mail. Verifique a configuração SMTP do servidor.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
        return ResponseEntity.ok(response);
    }

    private String resolveSenderEmail(UserDetails userDetails) {
        String stored = senderEmailService.get(username(userDetails));
        if (stored != null && !stored.isBlank()) {
            return stored;
        }
        User user = resolveUser(userDetails);
        return user != null ? user.getEmail() : null;
    }

    private String resolveSenderName(UserDetails userDetails) {
        User user = resolveUser(userDetails);
        if (user == null) {
            return "equipe comercial";
        }
        return user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUsername();
    }

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) {
            return null;
        }
        return userRepository.findByUsername(userDetails.getUsername())
                .or(() -> userRepository.findByEmailIgnoreCase(userDetails.getUsername()))
                .orElse(null);
    }

    private static String username(UserDetails userDetails) {
        return userDetails != null ? userDetails.getUsername() : null;
    }

    private static String text(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String buildDefaultWhatsAppMessage(String name, String company, String senderName) {
        String greeting = name != null ? "Olá, " + name + "!" : "Olá!";
        String target = company != null ? "a " + company : "sua empresa";
        return greeting + "\n\nSou " + senderName + " da Promover / Secured Guard e gostaria de apresentar "
                + "nossas soluções integradas de segurança patrimonial, portaria, controle de acesso e facilities para "
                + target + ".\n\nVocê teria 5 minutos para uma conversa rápida nesta semana?";
    }

    private static String buildPresentationHtml(String name, String company, String customMessage,
                                                String senderEmail, String senderName) {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><body style=\"font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.6;\">");
        sb.append("<h2 style=\"color:#b8860b;\">Promover / Secured Guard</h2>");
        sb.append("<p>Olá").append(name != null ? ", " + escape(name) : "").append("!</p>");
        sb.append("<p>Sou ").append(escape(senderName))
                .append(" e gostaria de apresentar nossa empresa e as soluções integradas de ")
                .append("segurança patrimonial armada e desarmada, portaria, recepção, controle de acesso, ")
                .append("monitoramento 24h e facilities.</p>");
        if (company != null) {
            sb.append("<p>Esta apresentação foi preparada para ").append(escape(company)).append(".</p>");
        }
        if (customMessage != null && !customMessage.isBlank()) {
            sb.append("<p>").append(escape(customMessage).replace("\n", "<br/>")).append("</p>");
        }
        sb.append("<p>Se desejar, posso enviar nossa apresentação completa em PDF ou agendar uma conversa.</p>");
        sb.append("<p style=\"color:#666;font-size:12px;margin-top:32px;\">")
                .append("Enviado por ").append(escape(senderName)).append(" — ")
                .append(escape(senderEmail))
                .append("<br/>Promover / Secured Guard — Segurança Patrimonial, Portaria e Facilities.</p>");
        sb.append("</body></html>");
        return sb.toString();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
