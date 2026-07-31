-- Vínculo N:N entre profissional de SST e empresas (permite atuar nas 3 empresas).
CREATE TABLE IF NOT EXISTS safety_engineer_companies (
    safety_engineer_id UUID NOT NULL,
    company_id UUID NOT NULL,
    CONSTRAINT pk_safety_engineer_companies PRIMARY KEY (safety_engineer_id, company_id),
    CONSTRAINT fk_sec_engineer FOREIGN KEY (safety_engineer_id) REFERENCES safety_engineers (id) ON DELETE CASCADE,
    CONSTRAINT fk_sec_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sec_company_id ON safety_engineer_companies (company_id);

-- Migra o vínculo atual (company_id da tabela safety_engineers)
INSERT INTO safety_engineer_companies (safety_engineer_id, company_id)
SELECT id, company_id
FROM safety_engineers
WHERE company_id IS NOT NULL
ON CONFLICT DO NOTHING;
