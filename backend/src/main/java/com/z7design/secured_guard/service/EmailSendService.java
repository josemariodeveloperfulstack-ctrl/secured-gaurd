package com.z7design.secured_guard.service;

import com.z7design.secured_guard.factory.DynamicMailSenderFactory;
import com.z7design.secured_guard.model.EmailAccount;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailSendService {

    private final DynamicMailSenderFactory mailSenderFactory;
    
    // Extensões de arquivos perigosos
    private static final List<String> DANGEROUS_EXTENSIONS = List.of(
        ".exe", ".bat", ".cmd", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".msc", ".scr", ".pif", ".msi", ".com"
    );

    public void sendEmail(EmailAccount account, String to, String cc, String bcc, String subject, String htmlBody, List<MultipartFile> attachments) {
        try {
            JavaMailSender mailSender = mailSenderFactory.createSender(account);
            MimeMessage message = mailSender.createMimeMessage();
            
            // True indica que é multipart
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(account.getEmail());
            helper.setTo(to);
            if (cc != null && !cc.isEmpty()) helper.setCc(cc.split(","));
            if (bcc != null && !bcc.isEmpty()) helper.setBcc(bcc.split(","));
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true para HTML
            
            if (attachments != null) {
                for (MultipartFile file : attachments) {
                    if (file.isEmpty() || file.getOriginalFilename() == null) continue;
                    
                    String filename = file.getOriginalFilename().toLowerCase();
                    if (isDangerousExtension(filename)) {
                        log.warn("Bloqueando anexo malicioso: {}", filename);
                        throw new IllegalArgumentException("Tipo de anexo não permitido por razões de segurança.");
                    }
                    
                    helper.addAttachment(file.getOriginalFilename(), file);
                }
            }
            
            mailSender.send(message);
            log.info("E-mail enviado com sucesso para: {}", to);
            
            // O IMAP Append (para pasta Enviados) será implementado via IMAP worker separadamente
            // pois alguns provedores como Gmail já salvam automaticamente.
            
        } catch (Exception e) {
            log.error("Erro ao enviar e-mail", e);
            throw new RuntimeException("Falha ao enviar e-mail: " + e.getMessage());
        }
    }
    
    private boolean isDangerousExtension(String filename) {
        return DANGEROUS_EXTENSIONS.stream().anyMatch(filename::endsWith);
    }
}
