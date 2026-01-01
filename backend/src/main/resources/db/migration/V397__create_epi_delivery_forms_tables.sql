-- Tabela de Fichas de Entrega de EPI
CREATE TABLE IF NOT EXISTS epi_delivery_forms (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    company_id UUID NOT NULL,
    delivery_date DATE NOT NULL,
    responsible_employee_id UUID,
    observations TEXT,
    pdf_url VARCHAR(500),
    created_by_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (responsible_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela de Itens de EPI dentro das Fichas
CREATE TABLE IF NOT EXISTS epi_delivery_form_items (
    id UUID PRIMARY KEY,
    delivery_form_id UUID NOT NULL,
    epi_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    ca VARCHAR(100),
    validity_date DATE,
    uniform_type VARCHAR(50),
    uniform_piece VARCHAR(50),
    observations TEXT,
    FOREIGN KEY (delivery_form_id) REFERENCES epi_delivery_forms(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_epi_delivery_forms_employee_id ON epi_delivery_forms(employee_id);
CREATE INDEX IF NOT EXISTS idx_epi_delivery_forms_company_id ON epi_delivery_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_epi_delivery_forms_delivery_date ON epi_delivery_forms(delivery_date);
CREATE INDEX IF NOT EXISTS idx_epi_delivery_form_items_delivery_form_id ON epi_delivery_form_items(delivery_form_id);

-- Comentários nas tabelas
COMMENT ON TABLE epi_delivery_forms IS 'Fichas completas de entrega de EPI para funcionários';
COMMENT ON TABLE epi_delivery_form_items IS 'Itens de EPI dentro de cada ficha de entrega';

