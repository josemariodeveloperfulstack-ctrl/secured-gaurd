package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rastreamento de abertura (pixel) e cliques para campanhas SMTP e como
 * reforço quando o Event Webhook do SendGrid não está acessível (ex.: localhost).
 */
@Service
@RequiredArgsConstructor
public class EmailTrackingService {

    private static final Logger LOG = LoggerFactory.getLogger(EmailTrackingService.class);

    private static final Pattern HREF_PATTERN = Pattern.compile(
            "(?i)<a\\s+([^>]*?)href=[\"']([^\"']+)[\"']([^>]*)>");

    private final EmailLogRepository emailLogRepository;
    private final RecipientLeadAutoCreationService recipientLeadAutoCreationService;
    private final Environment environment;

    @Value("${app.email.marketing.tracking-base-url:}")
    private String trackingBaseUrl;

    @Value("${app.email.marketing.assets-base-url:}")
    private String assetsBaseUrl;

    @Value("${app.email.marketing.assets-base-url-fallback:}")
    private String assetsBaseUrlFallback;

    /**
     * Injeta pixel de abertura e reescreve links HTTP(S) para passar pelo redirector.
     */
    public String injectTracking(String html, UUID emailLogId) {
        if (html == null || emailLogId == null) {
            return html;
        }
        String base = resolvePublicTrackingBase();
        if (base.isBlank()) {
            LOG.warn("Tracking de e-mail desativado: URL pública não configurada (emailLogId={})", emailLogId);
            return html;
        }

        String openUrl = base + "/email-marketing/track/open/" + emailLogId + ".gif";
        String pixel = "<img src=\"" + openUrl + "\" width=\"1\" height=\"1\" alt=\"\" "
                + "style=\"display:none!important;width:1px;height:1px;border:0;\" />";

        String withLinks = rewriteLinks(html, emailLogId, base);

        int bodyIdx = withLinks.toLowerCase().lastIndexOf("</body>");
        if (bodyIdx >= 0) {
            return withLinks.substring(0, bodyIdx) + pixel + withLinks.substring(bodyIdx);
        }
        return withLinks + pixel;
    }

    @Transactional
    public void recordOpen(UUID emailLogId) {
        emailLogRepository.findById(emailLogId).ifPresent(log -> {
            Instant now = Instant.now();
            if (log.getDeliveredAt() == null) {
                log.setDeliveredAt(now);
            }
            if (log.getReadAt() == null) {
                log.setReadAt(now);
            }
            promoteStatus(log, EmailLogStatus.DELIVERED);
            promoteStatus(log, EmailLogStatus.OPENED);
            emailLogRepository.save(log);
            tryAutoCreateLead(log);
            LOG.debug("Open registrado para emailLogId={}", emailLogId);
        });
    }

    /**
     * @return URL de destino decodificada ou vazio se inválida
     */
    @Transactional
    public Optional<String> recordClick(UUID emailLogId, String encodedTarget) {
        Optional<String> target = decodeTarget(encodedTarget);
        if (target.isEmpty()) {
            return Optional.empty();
        }
        emailLogRepository.findById(emailLogId).ifPresent(log -> {
            Instant now = Instant.now();
            if (log.getDeliveredAt() == null) {
                log.setDeliveredAt(now);
            }
            if (log.getReadAt() == null) {
                log.setReadAt(now);
            }
            if (log.getClickedAt() == null) {
                log.setClickedAt(now);
            }
            promoteStatus(log, EmailLogStatus.DELIVERED);
            promoteStatus(log, EmailLogStatus.OPENED);
            promoteStatus(log, EmailLogStatus.CLICKED);
            emailLogRepository.save(log);
            tryAutoCreateLead(log);
            LOG.debug("Click registrado para emailLogId={} -> {}", emailLogId, target.get());
        });
        return target;
    }

    private String rewriteLinks(String html, UUID emailLogId, String base) {
        Matcher matcher = HREF_PATTERN.matcher(html);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String href = matcher.group(2);
            if (shouldSkipLink(href, base)) {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
                continue;
            }
            String tracked = base + "/email-marketing/track/click/" + emailLogId
                    + "?u=" + encodeUrl(href);
            String replacement = "<a " + matcher.group(1) + "href=\"" + tracked + "\"" + matcher.group(3) + ">";
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private static boolean shouldSkipLink(String href, String base) {
        if (href == null || href.isBlank()) {
            return true;
        }
        String h = href.trim().toLowerCase();
        if (h.startsWith("mailto:") || h.startsWith("tel:") || h.startsWith("javascript:") || h.startsWith("#")) {
            return true;
        }
        if (h.contains("unsubscribe") || h.contains("/email-marketing/track/")) {
            return true;
        }
        if (base != null && h.startsWith(base.toLowerCase() + "/email-marketing/track/")) {
            return true;
        }
        return !(h.startsWith("http://") || h.startsWith("https://"));
    }

    private static String encodeUrl(String url) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(url.getBytes(StandardCharsets.UTF_8));
    }

    private Optional<String> decodeTarget(String encoded) {
        if (encoded == null || encoded.isBlank()) {
            return Optional.empty();
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8);
            String url = URLDecoder.decode(decoded, StandardCharsets.UTF_8);
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                return Optional.empty();
            }
            return Optional.of(url);
        } catch (Exception e) {
            LOG.warn("URL de clique inválida: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String resolvePublicTrackingBase() {
        String primary = stripTrailingSlashes(trackingBaseUrl);
        if (!primary.isBlank() && !isUnsafeForPublicEmail(primary)) {
            return primary;
        }
        String assets = stripTrailingSlashes(assetsBaseUrl);
        String fallback = stripTrailingSlashes(assetsBaseUrlFallback);
        if (isUnsafeForPublicEmail(assets) && !fallback.isBlank()) {
            return fallback;
        }
        if (!assets.isBlank() && !isUnsafeForPublicEmail(assets)) {
            return assets;
        }
        if (!fallback.isBlank()) {
            return fallback;
        }
        return "";
    }

    private static String stripTrailingSlashes(String s) {
        if (s == null) {
            return "";
        }
        String t = s.trim();
        while (t.endsWith("/")) {
            t = t.substring(0, t.length() - 1);
        }
        return t;
    }

    private static boolean isUnsafeForPublicEmail(String url) {
        if (url == null || url.isBlank()) {
            return true;
        }
        String lower = url.toLowerCase();
        return lower.contains("localhost")
                || lower.contains("127.0.0.1")
                || lower.contains("0.0.0.0")
                || lower.startsWith("http://192.168.")
                || lower.startsWith("http://10.")
                || lower.startsWith("http://172.");
    }

    private static void promoteStatus(EmailLog log, EmailLogStatus proposed) {
        if (log.getStatus() == EmailLogStatus.BOUNCED || log.getStatus() == EmailLogStatus.DROPPED) {
            return;
        }
        if (rank(proposed) >= rank(log.getStatus())) {
            log.setStatus(proposed);
        }
    }

    private static int rank(EmailLogStatus s) {
        if (s == null) {
            return 0;
        }
        return switch (s) {
            case BOUNCED, DROPPED -> 100;
            case REPLIED -> 90;
            case CLICKED -> 70;
            case OPENED -> 60;
            case DELIVERED -> 50;
            case SENT, DEFERRED -> 40;
            case PENDING -> 10;
        };
    }

    private void tryAutoCreateLead(EmailLog emailLog) {
        try {
            if (emailLog.getRecipient() != null && emailLog.getRecipient().getLead() == null) {
                recipientLeadAutoCreationService.ensureLeadFor(emailLog.getRecipient());
            }
        } catch (Exception e) {
            LOG.warn("Falha ao auto-criar Lead após tracking: {}", e.getMessage());
        }
    }
}
