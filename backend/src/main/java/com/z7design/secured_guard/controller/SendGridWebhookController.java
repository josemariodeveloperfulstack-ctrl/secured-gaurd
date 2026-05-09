package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.sendgrid.SendGridInboundParseService;
import com.z7design.secured_guard.service.sendgrid.SendGridWebhookSignatureVerifier;
import com.z7design.secured_guard.worker.SendGridEventWorker;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/webhooks/sendgrid")
@RequiredArgsConstructor
public class SendGridWebhookController {

    private final SendGridWebhookSignatureVerifier signatureVerifier;
    private final SendGridInboundParseService inboundParseService;
    private final StringRedisTemplate stringRedisTemplate;

    @Value("${sendgrid.inbound.shared-secret:}")
    private String inboundSharedSecret;

    @PostMapping(value = "/events", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> events(
            HttpServletRequest request,
            @RequestHeader(value = "X-Twilio-Email-Event-Webhook-Signature", required = false) String signature,
            @RequestHeader(value = "X-Twilio-Email-Event-Webhook-Timestamp", required = false) String twilioTimestamp)
            throws Exception {

        byte[] bodyBytes = StreamUtils.copyToByteArray(request.getInputStream());
        String rawBody = new String(bodyBytes, StandardCharsets.UTF_8);

        if (!signatureVerifier.verify(twilioTimestamp, rawBody, signature)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Map<String, String> fields = new HashMap<>();
        fields.put("payload", rawBody);
        stringRedisTemplate.opsForStream().add(SendGridEventWorker.STREAM_SENDGRID_EVENTS, fields);
        return ResponseEntity.accepted().build();
    }

    @PostMapping(value = "/inbound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> inbound(
            MultipartHttpServletRequest request,
            @RequestParam(value = "token", required = false) String token) throws Exception {

        if (inboundSharedSecret != null && !inboundSharedSecret.isBlank()) {
            if (token == null || !inboundSharedSecret.equals(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        inboundParseService.handleInbound(request);
        return ResponseEntity.accepted().build();
    }
}
