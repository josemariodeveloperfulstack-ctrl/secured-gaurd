package com.z7design.secured_guard.service.sendgrid;

import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters;
import org.bouncycastle.crypto.signers.Ed25519Signer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Verifica assinatura Ed25519 dos Event Webhooks do SendGrid/Twilio
 * (cabeçalhos {@code X-Twilio-Email-Event-Webhook-Signature} e
 * {@code X-Twilio-Email-Event-Webhook-Timestamp}).
 */
@Component
public class SendGridWebhookSignatureVerifier {

    private static final Logger LOGGER = LoggerFactory.getLogger(SendGridWebhookSignatureVerifier.class);

    @Value("${sendgrid.webhook.public-key-base64:}")
    private String publicKeyBase64;

    @Value("${sendgrid.webhook.require-signature:false}")
    private boolean requireSignature;

    public boolean isVerificationConfigured() {
        return publicKeyBase64 != null && !publicKeyBase64.isBlank();
    }

    /**
     * @param timestampHeader valor do cabeçalho Twilio (timestamp)
     * @param rawBody         corpo bruto da requisição (UTF-8)
     * @param signatureHeader assinatura em Base64
     * @return true se válido ou se verificação estiver desligada e não obrigatória
     */
    public boolean verify(String timestampHeader, String rawBody, String signatureHeader) {
        if (!isVerificationConfigured()) {
            if (requireSignature) {
                LOGGER.error("SendGrid webhook: require-signature=true mas chave pública ausente");
                return false;
            }
            LOGGER.debug("SendGrid webhook: assinatura não verificada (chave ausente, require-signature=false)");
            return true;
        }
        if (signatureHeader == null || signatureHeader.isBlank() || timestampHeader == null) {
            return false;
        }
        try {
            byte[] publicRaw = Base64.getDecoder().decode(publicKeyBase64.trim());
            if (publicRaw.length != 32) {
                LOGGER.warn("SendGrid webhook: chave pública Ed25519 deve decodificar para 32 bytes, obtido {}", publicRaw.length);
                return false;
            }
            Ed25519PublicKeyParameters publicKey = new Ed25519PublicKeyParameters(publicRaw, 0);
            String signedPayload = timestampHeader + rawBody;
            byte[] msg = signedPayload.getBytes(StandardCharsets.UTF_8);
            byte[] sig = Base64.getDecoder().decode(signatureHeader.trim());

            Ed25519Signer verifier = new Ed25519Signer();
            verifier.init(false, publicKey);
            verifier.update(msg, 0, msg.length);
            return verifier.verifySignature(sig);
        } catch (Exception e) {
            LOGGER.warn("SendGrid webhook: falha ao verificar assinatura: {}", e.getMessage());
            return false;
        }
    }
}
