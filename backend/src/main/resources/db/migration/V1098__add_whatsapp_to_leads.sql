-- WhatsApp qualificado dos leads prospectados (formato (DD) 9XXXX-XXXX, max. 20 chars)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

COMMENT ON COLUMN leads.whatsapp IS 'WhatsApp validado e normalizado obtido na prospecção comercial';
