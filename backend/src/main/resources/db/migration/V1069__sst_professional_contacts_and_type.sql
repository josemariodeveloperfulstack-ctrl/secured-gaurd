-- Profissional de SST: contatos, tipo/registro e status ativo
ALTER TABLE safety_engineers ADD COLUMN IF NOT EXISTS phone VARCHAR(40);
ALTER TABLE safety_engineers ADD COLUMN IF NOT EXISTS email VARCHAR(180);
ALTER TABLE safety_engineers ADD COLUMN IF NOT EXISTS professional_type VARCHAR(40) NOT NULL DEFAULT 'ENGENHEIRO_SEGURANCA';
ALTER TABLE safety_engineers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE safety_engineers ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON TABLE safety_engineers IS 'Profissionais de SST responsáveis por assinar OS/relatórios e orientar a empresa';
COMMENT ON COLUMN safety_engineers.crea_number IS 'Registro profissional (CREA, MTE, CRM etc.)';
COMMENT ON COLUMN safety_engineers.professional_type IS 'ENGENHEIRO_SEGURANCA | TECNICO_SEGURANCA | MEDICO_TRABALHO | OUTRO';
COMMENT ON COLUMN safety_engineers.stamp_image_url IS 'URL da imagem do carimbo/assinatura usada em OS e relatórios';
COMMENT ON COLUMN safety_engineers.phone IS 'Telefone de contato do profissional';
COMMENT ON COLUMN safety_engineers.email IS 'E-mail de contato do profissional';
COMMENT ON COLUMN safety_engineers.notes IS 'Observações / escopo de responsabilidade SST';

CREATE INDEX IF NOT EXISTS idx_safety_engineers_active ON safety_engineers(active);
CREATE INDEX IF NOT EXISTS idx_safety_engineers_type ON safety_engineers(professional_type);
