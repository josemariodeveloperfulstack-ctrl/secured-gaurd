-- Criar tabela de supervisores (consolidada a partir de create_supervisors_table.sql)
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    face_embedding BYTEA,
    face_encoding TEXT,
    face_template BYTEA,
    face_quality_score DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supervisors_cpf ON supervisors(cpf);
CREATE INDEX IF NOT EXISTS idx_supervisors_email ON supervisors(email);
CREATE INDEX IF NOT EXISTS idx_supervisors_active ON supervisors(is_active);
CREATE INDEX IF NOT EXISTS idx_supervisors_created_at ON supervisors(created_at);

CREATE OR REPLACE FUNCTION update_supervisors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supervisors_updated_at ON supervisors;
CREATE TRIGGER trigger_update_supervisors_updated_at
    BEFORE UPDATE ON supervisors
    FOR EACH ROW
    EXECUTE FUNCTION update_supervisors_updated_at();
