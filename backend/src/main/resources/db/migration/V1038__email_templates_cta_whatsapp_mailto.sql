-- Separa CTAs: botão vermelho → WhatsApp; botão amarelo "Solicitar apresentação" → mailto ({{solicitarApresentacaoUrl}} injetado em runtime).
UPDATE email_templates
SET html_body = replace(
        replace(
                html_body,
                'background-color:#DD0000;"><a href="{{ctaUrl}}"',
                'background-color:#DD0000;"><a href="{{whatsappUrl}}"'
        ),
        'background-color:#FFCC00;"><a href="{{ctaUrl}}"',
        'background-color:#FFCC00;"><a href="{{solicitarApresentacaoUrl}}"'
    ),
    updated_at = now()
WHERE code IN ('welcome', 'promotion', 'follow_up');
