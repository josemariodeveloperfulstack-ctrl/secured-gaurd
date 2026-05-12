package com.z7design.secured_guard.service.sendgrid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.model.EmailAttachment;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.enums.AttachmentScanStatus;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.repository.EmailAttachmentRepository;
import com.z7design.secured_guard.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SendGridInboundParseService {

    private static final Pattern ANGLE_EMAIL = Pattern.compile("<([^>]+)>");
    private static final long MAX_ATTACHMENT_BYTES = 25L * 1024 * 1024;

    private final ObjectMapper objectMapper;
    private final EmailLogRepository emailLogRepository;
    private final EmailAttachmentRepository emailAttachmentRepository;
    private final AttachmentVirusScanner attachmentVirusScanner;
    private final RecipientLeadAutoCreationService recipientLeadAutoCreationService;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    @Transactional
    public void handleInbound(MultipartHttpServletRequest request) throws IOException {
        String fromRaw = Optional.ofNullable(request.getParameter("from")).orElse("");
        String fromEmail = extractEmail(fromRaw);
        if (fromEmail.isEmpty()) {
            log.warn("SendGrid inbound: campo 'from' vazio ou inválido");
            return;
        }

        List<EmailLog> candidates = emailLogRepository.findRecentByRecipientEmail(fromEmail);
        if (candidates.isEmpty()) {
            log.warn("SendGrid inbound: nenhum EmailLog para remetente {}", fromEmail);
            return;
        }
        EmailLog emailLog = candidates.get(0);
        emailLog.setStatus(EmailLogStatus.REPLIED);
        if (emailLog.getRepliedAt() == null) {
            emailLog.setRepliedAt(Instant.now());
        }
        if (emailLog.getRecipient() != null && emailLog.getRecipient().getLead() == null) {
            recipientLeadAutoCreationService.ensureLeadFor(emailLog.getRecipient());
        }
        emailLogRepository.save(emailLog);

        String attachmentInfoJson = request.getParameter("attachment-info");
        if (attachmentInfoJson != null && !attachmentInfoJson.isBlank()) {
            JsonNode root = objectMapper.readTree(attachmentInfoJson);
            Iterator<String> fieldNames = root.fieldNames();
            while (fieldNames.hasNext()) {
                String key = fieldNames.next();
                if (!key.startsWith("attachment")) {
                    continue;
                }
                MultipartFile file = request.getFile(key);
                if (file == null || file.isEmpty()) {
                    continue;
                }
                if (file.getSize() > MAX_ATTACHMENT_BYTES) {
                    log.warn("SendGrid inbound: anexo {} excede tamanho máximo", key);
                    continue;
                }
                JsonNode meta = root.get(key);
                String filename = meta != null && meta.has("filename") ? meta.get("filename").asText() : key;
                String contentType = meta != null && meta.has("type") ? meta.get("type").asText() : file.getContentType();

                Path dir = Paths.get(uploadBaseDir, "sendgrid-inbound", emailLog.getId().toString());
                Files.createDirectories(dir);
                String safeName = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
                Path target = dir.resolve(UUID.randomUUID() + "_" + safeName);
                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

                AttachmentScanStatus scan = AttachmentScanStatus.CLEAN;
                if (!attachmentVirusScanner.scan(target)) {
                    scan = AttachmentScanStatus.INFECTED;
                }

                EmailAttachment att = EmailAttachment.builder()
                        .emailLog(emailLog)
                        .fileUrl(target.toUri().toString())
                        .fileSize(file.getSize())
                        .contentType(contentType)
                        .originalFilename(filename)
                        .scanStatus(scan)
                        .build()
                ;
                emailAttachmentRepository.save(att);
            }
        }
    }

    private static String extractEmail(String fromRaw) {
        if (fromRaw == null) {
            return "";
        }
        Matcher m = ANGLE_EMAIL.matcher(fromRaw);
        if (m.find()) {
            return m.group(1).trim().toLowerCase();
        }
        int at = fromRaw.indexOf('@');
        if (at > 0) {
            return fromRaw.trim().toLowerCase();
        }
        return "";
    }
}
