package com.z7design.secured_guard.service.sendgrid;

/**
 * Imagem embutida (CID) para clientes de e-mail HTML.
 *
 * @param contentId identificador referenciado no HTML como {@code cid:contentId}
 * @param data      bytes da imagem
 * @param mimeType  ex.: image/png
 */
public record EmailInlineImage(String contentId, byte[] data, String mimeType) {
}
