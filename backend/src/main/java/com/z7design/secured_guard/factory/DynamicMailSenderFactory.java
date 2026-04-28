package com.z7design.secured_guard.factory;

import com.z7design.secured_guard.model.EmailAccount;
import com.z7design.secured_guard.service.EncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.util.Properties;

@Component
@RequiredArgsConstructor
public class DynamicMailSenderFactory {

    private final EncryptionService encryptionService;

    public JavaMailSender createSender(EmailAccount account) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(account.getSmtpHost());
        mailSender.setPort(account.getSmtpPort());
        
        mailSender.setUsername(account.getEmail());
        
        String decryptedPassword = encryptionService.decryptPassword(account.getEncryptedPassword());
        mailSender.setPassword(decryptedPassword);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.ssl.enable", account.getSmtpPort() == 465 ? "true" : "false");

        return mailSender;
    }
}
