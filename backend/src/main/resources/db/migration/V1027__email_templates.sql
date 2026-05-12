-- Templates reutilizáveis para campanhas de e-mail marketing
-- Suporta variáveis dinâmicas no formato {{variavel}} (ex.: {{nomeContato}}, {{nomeEmpresa}})

CREATE TABLE IF NOT EXISTS email_templates (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(100) UNIQUE,
    name         VARCHAR(255) NOT NULL,
    subject      VARCHAR(500) NOT NULL,
    html_body    TEXT         NOT NULL,
    description  TEXT,
    variables    JSONB,
    is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_default ON email_templates(is_default) WHERE is_default = TRUE;

-- Sementes: 3 templates padrão (sincronizáveis pela UI)
-- O HTML é minimalista; o conteúdo final é editado pelo usuário.
INSERT INTO email_templates (code, name, subject, html_body, description, variables, is_default, is_active)
VALUES
(
    'welcome',
    'Boas-vindas - Apresentação',
    'Olá {{nomeContato}}, é um prazer falar com você',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">' ||
    '<h2 style="color: #111827;">Olá {{nomeContato}},</h2>' ||
    '<p>É um prazer apresentar nossa empresa para a <strong>{{nomeEmpresa}}</strong>.</p>' ||
    '<p>Oferecemos soluções pensadas para o seu segmento. Posso compartilhar uma proposta inicial assim que entendermos suas necessidades.</p>' ||
    '<p>Atenciosamente,<br/>Equipe Comercial</p>' ||
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>' ||
    '<p style="font-size:12px;color:#6b7280">Não deseja mais receber estes e-mails? <a href="{{unsubscribeUrl}}" style="color:#6b7280">Cancelar inscrição</a>.</p>' ||
    '</div>',
    'Primeiro contato apresentando a empresa e abrindo conversa.',
    '["nomeContato","nomeEmpresa","unsubscribeUrl"]'::jsonb,
    TRUE,
    TRUE
),
(
    'promotion',
    'Promoção - Ofertas Especiais',
    'Ofertas Especiais da Semana para {{nomeEmpresa}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">' ||
    '<h2 style="color: #111827;">{{nomeContato}}, condições especiais esta semana</h2>' ||
    '<p>Preparamos uma seleção de ofertas para a <strong>{{nomeEmpresa}}</strong>.</p>' ||
    '<p>Clique abaixo para conhecer os detalhes:</p>' ||
    '<p><a href="{{ctaUrl}}" style="display:inline-block;background:#facc15;color:#111827;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Ver ofertas</a></p>' ||
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>' ||
    '<p style="font-size:12px;color:#6b7280">Não deseja mais receber estes e-mails? <a href="{{unsubscribeUrl}}" style="color:#6b7280">Cancelar inscrição</a>.</p>' ||
    '</div>',
    'Envio promocional com call-to-action principal.',
    '["nomeContato","nomeEmpresa","ctaUrl","unsubscribeUrl"]'::jsonb,
    TRUE,
    TRUE
),
(
    'follow_up',
    'Follow-up - Pós Visita ou Proposta',
    'Como podemos ajudar você hoje, {{nomeContato}}?',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">' ||
    '<h2 style="color: #111827;">Olá {{nomeContato}},</h2>' ||
    '<p>Estamos retomando o contato sobre a conversa anterior com a <strong>{{nomeEmpresa}}</strong>.</p>' ||
    '<p>Se tiver dúvidas sobre nossa proposta ou precisar de mais informações, estou à disposição.</p>' ||
    '<p>Posso agendar uma chamada rápida?</p>' ||
    '<p>Atenciosamente,<br/>Equipe Comercial</p>' ||
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>' ||
    '<p style="font-size:12px;color:#6b7280">Não deseja mais receber estes e-mails? <a href="{{unsubscribeUrl}}" style="color:#6b7280">Cancelar inscrição</a>.</p>' ||
    '</div>',
    'Reaproximação após visita ou envio de proposta.',
    '["nomeContato","nomeEmpresa","unsubscribeUrl"]'::jsonb,
    TRUE,
    TRUE
)
ON CONFLICT (code) DO NOTHING;
