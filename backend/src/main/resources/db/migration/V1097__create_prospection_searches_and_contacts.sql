-- V1097: Criação das tabelas de histórico de prospecção, empresas e contatos de decisores/compras
CREATE TABLE IF NOT EXISTS prospection_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_busca VARCHAR(50) NOT NULL,
    termo_pesquisa VARCHAR(255),
    cidade VARCHAR(100),
    uf VARCHAR(10),
    segmento VARCHAR(100),
    total_encontrados INT DEFAULT 0,
    user_id UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospection_searches_created_at ON prospection_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospection_searches_user_id ON prospection_searches(user_id);

CREATE TABLE IF NOT EXISTS prospection_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES prospection_searches(id) ON DELETE CASCADE,
    cnpj VARCHAR(20),
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    municipio VARCHAR(100),
    uf VARCHAR(10),
    email VARCHAR(255),
    email_compras VARCHAR(255),
    telefone VARCHAR(50),
    website VARCHAR(255),
    origem VARCHAR(50),
    detalhes_json TEXT,
    lead_id UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospection_companies_search_id ON prospection_companies(search_id);
CREATE INDEX IF NOT EXISTS idx_prospection_companies_cnpj ON prospection_companies(cnpj);

CREATE TABLE IF NOT EXISTS prospection_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES prospection_companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cargo_tipo VARCHAR(50) NOT NULL, -- 'SOCIO', 'DECISOR', 'COMPRAS'
    cargo_descricao VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(50),
    linkedin_url VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospection_contacts_company_id ON prospection_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_prospection_contacts_cargo_tipo ON prospection_contacts(cargo_tipo);
