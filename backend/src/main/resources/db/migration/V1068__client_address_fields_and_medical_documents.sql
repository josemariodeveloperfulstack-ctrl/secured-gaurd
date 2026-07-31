-- Endereço detalhado no cadastro de clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_number VARCHAR(30);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_complement VARCHAR(120);

COMMENT ON COLUMN clients.neighborhood IS 'Bairro do endereço do cliente';
COMMENT ON COLUMN clients.address_number IS 'Número do endereço';
COMMENT ON COLUMN clients.address_complement IS 'Complemento (apto, sala, bloco etc.)';

-- Gestão de Atestados, Declarações e Afastamentos médicos
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    company_id UUID REFERENCES companies(id),
    document_type VARCHAR(40) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    days INTEGER,
    hours NUMERIC(6, 2),
    cid_code VARCHAR(20),
    cid_description VARCHAR(500),
    specialty VARCHAR(120),
    crm VARCHAR(40),
    doctor_name VARCHAR(255),
    document_url VARCHAR(1000),
    observations TEXT,
    inss_alert BOOLEAN NOT NULL DEFAULT FALSE,
    inss_alert_message VARCHAR(1000),
    related_days_in_window INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_documents_employee ON medical_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_company ON medical_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_type ON medical_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_medical_documents_start ON medical_documents(start_date);
CREATE INDEX IF NOT EXISTS idx_medical_documents_cid ON medical_documents(cid_code);
CREATE INDEX IF NOT EXISTS idx_medical_documents_employee_cid_dates
    ON medical_documents(employee_id, cid_code, start_date, end_date);

CREATE TABLE IF NOT EXISTS medical_document_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
    action VARCHAR(40) NOT NULL,
    details TEXT,
    changed_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_document_history_doc
    ON medical_document_history(medical_document_id);
