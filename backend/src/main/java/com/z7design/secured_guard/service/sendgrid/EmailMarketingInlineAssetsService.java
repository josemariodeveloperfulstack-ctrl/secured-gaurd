package com.z7design.secured_guard.service.sendgrid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Carrega logomarca e banner oficiais do marketing e expõe placeholders {@code cid:}
 * para envio embutido no e-mail (Gmail/Outlook não dependem de URL pública).
 */
@Service
public class EmailMarketingInlineAssetsService {

    private static final Logger LOG = LoggerFactory.getLogger(EmailMarketingInlineAssetsService.class);

    public static final String CID_LOGO = "promover-logo";
    public static final String CID_BANNER = "promover-hero-banner";

    private static final String LOGO_CLASSPATH = "static/email-marketing/promover-logo.png";
    private static final String BANNER_CLASSPATH = "static/email-marketing/promover-hero-banner.png";

    private volatile List<EmailInlineImage> standardImages;

    /**
     * Injeta URLs {@code cid:} no contexto do template (substituem links HTTP externos).
     */
    public void putCidPlaceholders(Map<String, String> context) {
        context.put("brandLogoUrl", "cid:" + CID_LOGO);
        context.put("brandBannerUrl", "cid:" + CID_BANNER);
    }

    /**
     * Imagens padrão anexadas inline em cada envio de campanha.
     */
    public List<EmailInlineImage> standardMarketingImages() {
        List<EmailInlineImage> local = standardImages;
        if (local != null) {
            return local;
        }
        synchronized (this) {
            if (standardImages != null) {
                return standardImages;
            }
            List<EmailInlineImage> loaded = new ArrayList<>(2);
            loadOptional(LOGO_CLASSPATH, CID_LOGO, "image/png").ifPresent(loaded::add);
            loadOptional(BANNER_CLASSPATH, CID_BANNER, "image/png").ifPresent(loaded::add);
            if (loaded.isEmpty()) {
                LOG.warn("Nenhuma imagem de marketing encontrada em classpath ({} / {}). "
                        + "E-mails podem exibir logo/banner quebrados.",
                        LOGO_CLASSPATH, BANNER_CLASSPATH);
            } else {
                LOG.info("Imagens inline de e-mail marketing carregadas: {} ficheiro(s)", loaded.size());
            }
            standardImages = List.copyOf(loaded);
            return standardImages;
        }
    }

    private static java.util.Optional<EmailInlineImage> loadOptional(String classpath, String contentId, String mime) {
        try {
            ClassPathResource resource = new ClassPathResource(classpath);
            if (!resource.exists()) {
                LOG.warn("Recurso de e-mail marketing ausente: {}", classpath);
                return java.util.Optional.empty();
            }
            byte[] bytes;
            try (InputStream in = resource.getInputStream()) {
                bytes = in.readAllBytes();
            }
            if (bytes.length == 0) {
                LOG.warn("Recurso de e-mail marketing vazio: {}", classpath);
                return java.util.Optional.empty();
            }
            return java.util.Optional.of(new EmailInlineImage(contentId, bytes, mime));
        } catch (IOException e) {
            LOG.error("Falha ao carregar imagem inline {}: {}", classpath, e.getMessage());
            return java.util.Optional.empty();
        }
    }
}
