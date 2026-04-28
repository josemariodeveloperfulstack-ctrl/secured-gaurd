package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.ScheduledEmail;
import com.z7design.secured_guard.model.ScheduledEmailAttachment;
import com.z7design.secured_guard.repository.ScheduledEmailRepository;
import com.z7design.secured_guard.service.EncryptionService;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import jakarta.activation.DataHandler;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledEmailWorker {

    private final ScheduledEmailRepository scheduledEmailRepository;
    private final EncryptionService encryptionService;

    @Scheduled(fixedDelay = 60000) // Every minute
    public void processScheduledEmails() {
        List<ScheduledEmail> pending = scheduledEmailRepository.findByStatusAndScheduledTimeBefore("PENDING", LocalDateTime.now());
        if (pending.isEmpty()) return;
        
        log.info("Processando {} e-mails agendados", pending.size());
        
        for (ScheduledEmail email : pending) {
            try {
                sendEmail(email);
                email.setStatus("SENT");
            } catch (Exception e) {
                log.error("Erro ao enviar e-mail agendado: " + email.getId(), e);
                email.setStatus("FAILED");
            }
            scheduledEmailRepository.save(email);
        }
    }

    private void sendEmail(ScheduledEmail scheduled) throws Exception {
        var account = scheduled.getAccount();
        String password = encryptionService.decryptPassword(account.getEncryptedPassword());

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", account.getSmtpHost());
        props.put("mail.smtp.port", String.valueOf(account.getSmtpPort()));
        props.put("mail.smtp.ssl.trust", account.getSmtpHost());

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(account.getEmail(), password);
            }
        });

        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(account.getEmail()));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(scheduled.getToAddress()));
        
        if (scheduled.getCcAddress() != null && !scheduled.getCcAddress().isEmpty()) {
            message.setRecipients(Message.RecipientType.CC, InternetAddress.parse(scheduled.getCcAddress()));
        }
        if (scheduled.getBccAddress() != null && !scheduled.getBccAddress().isEmpty()) {
            message.setRecipients(Message.RecipientType.BCC, InternetAddress.parse(scheduled.getBccAddress()));
        }
        
        message.setSubject(scheduled.getSubject());

        MimeBodyPart messageBodyPart = new MimeBodyPart();
        messageBodyPart.setContent(scheduled.getBody(), "text/html; charset=utf-8");

        Multipart multipart = new MimeMultipart();
        multipart.addBodyPart(messageBodyPart);

        if (scheduled.getAttachments() != null) {
            for (ScheduledEmailAttachment att : scheduled.getAttachments()) {
                MimeBodyPart attachPart = new MimeBodyPart();
                ByteArrayDataSource ds = new ByteArrayDataSource(att.getContent(), att.getContentType());
                attachPart.setDataHandler(new DataHandler(ds));
                attachPart.setFileName(att.getFilename());
                multipart.addBodyPart(attachPart);
            }
        }

        message.setContent(multipart);
        Transport.send(message);
    }
}
