-- Criação das tabelas para Acordo de Recolhimento (Módulo Compras)
CREATE TABLE IF NOT EXISTS acordos_recolhimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_acordo VARCHAR(50) NOT NULL UNIQUE,
    fornecedor_id UUID NOT NULL,
    fornecedor_nome VARCHAR(255),
    fornecedor_cnpj VARCHAR(18),
    data_acordo DATE NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    observacoes TEXT,
    created_by_id UUID,
    approved_by_id UUID,
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acordo_recolhimento_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acordo_id UUID NOT NULL REFERENCES acordos_recolhimento(id) ON DELETE CASCADE,
    descricao VARCHAR(500) NOT NULL,
    quantidade DECIMAL(15,2) NOT NULL,
    unidade VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_acordos_reco_fornecedor ON acordos_recolhimento(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_acordos_reco_status ON acordos_recolhimento(status);
CREATE INDEX IF NOT EXISTS idx_acordos_reco_data ON acordos_recolhimento(data_acordo);
CREATE INDEX IF NOT EXISTS idx_acordo_items_acordo ON acordo_recolhimento_items(acordo_id);

-- Permissões para o novo módulo
INSERT INTO permissions (id, name, description)
SELECT gen_random_uuid(), 'PURCHASE_AGREEMENT_READ', 'Ler Acordos de Recolhimento'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'PURCHASE_AGREEMENT_READ');

INSERT INTO permissions (id, name, description)
SELECT gen_random_uuid(), 'PURCHASE_AGREEMENT_WRITE', 'Gerenciar Acordos de Recolhimento'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'PURCHASE_AGREEMENT_WRITE');

-- Atribuição de permissões aos papéis relevantes
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'COMPRAS', 'SUPRIMENTOS', 'ALMOXARIFADO', 'ANALISTA_SUPRIMENTOS')
AND p.name IN ('PURCHASE_AGREEMENT_READ', 'PURCHASE_AGREEMENT_WRITE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
