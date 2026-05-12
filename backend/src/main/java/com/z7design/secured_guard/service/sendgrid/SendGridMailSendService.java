package com.z7design.secured_guard.service.sendgrid;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.ClickTrackingSetting;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.OpenTrackingSetting;
import com.sendgrid.helpers.mail.objects.Personalization;
import com.sendgrid.helpers.mail.objects.TrackingSettings;
import com.z7design.secured_guard.model.EmailLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

@Service
public class SendGridMailSendService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SendGridMailSendService.class);

    @Value("${sendgrid.api-key:}")
    private String apiKey;

    @Value("${sendgrid.from-email:}")
    private String fromEmail;

    @Value("${sendgrid.from-name:SecuredGuard}")
    private String fromName;

    public String sendHtml(EmailLog emailLog, String toEmail, String toName, String subject, String htmlBody) throws IOException {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Variável sendgrid.api-key / SENDGRID_API_KEY não configurada");
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new IllegalStateException("Variável sendgrid.from-email / SENDGRID_FROM_EMAIL não configurada");
        }

        Mail mail = new Mail();
        mail.setFrom(new Email(fromEmail, fromName));
        mail.addContent(new Content("text/html", htmlBody));

        // Garante open/click tracking no envio (além das definições da conta SendGrid).
        ClickTrackingSetting click = new ClickTrackingSetting();
        click.setEnable(true);
        click.setEnableText(false);
        OpenTrackingSetting open = new OpenTrackingSetting();
        open.setEnable(true);
        TrackingSettings tracking = new TrackingSettings();
        tracking.setClickTrackingSetting(click);
        tracking.setOpenTrackingSetting(open);
        mail.setTrackingSettings(tracking);

        // custom_args só na Personalization (a API v3 proíbe a mesma chave no Mail e na Personalization).
        String logId = emailLog.getId().toString();
        Personalization p = new Personalization();
        p.addTo(new Email(toEmail, toName != null ? toName : ""));
        p.setSubject(subject);
        p.addCustomArg("email_log_id", logId);
        mail.addPersonalization(p);

        SendGrid sg = new SendGrid(apiKey);
        Request request = new Request();
        request.setMethod(Method.POST);
        request.setEndpoint("mail/send");
        request.setBody(mail.build());

        Response response = sg.api(request);
        int status = response.getStatusCode();
        if (status >= 400) {
            LOGGER.error("SendGrid mail/send falhou: status={}, body={}", status, response.getBody());
            throw new IOException("SendGrid retornou HTTP " + status + ": " + response.getBody());
        }
        return extractMessageId(response);
    }

    private static String extractMessageId(Response response) {
        if (response.getHeaders() == null) {
            return null;
        }
        for (Map.Entry<String, String> e : response.getHeaders().entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase("X-Message-Id") && e.getValue() != null) {
                return e.getValue().trim().replace("<", "").replace(">", "");
            }
        }
        return null;
    }
}
