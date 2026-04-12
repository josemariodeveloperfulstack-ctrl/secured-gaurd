-- Requisições de estoque multi-item (aprovação, PDF, entrega com assinatura)

-- PostgreSQL exige PK ou UNIQUE na coluna referenciada por FK. Bases legadas podem ter
-- stock_items sem PRIMARY KEY em id (erro 42830).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'stock_items'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint co
        JOIN pg_class cl ON cl.oid = co.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'public'
          AND cl.relname = 'stock_items'
          AND co.contype = 'p'
    ) THEN
        ALTER TABLE stock_items ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS stock_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_number VARCHAR(64) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    requested_by_user_id UUID REFERENCES users(id),
    movement_reason VARCHAR(64) NOT NULL,
    notes TEXT,
    status VARCHAR(32) NOT NULL,
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    delivered_at TIMESTAMP,
    delivered_by_user_id UUID REFERENCES users(id),
    signature_type VARCHAR(20),
    digital_signature TEXT,
    signature_at TIMESTAMP,
    physical_signature_ack TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_requisitions_employee ON stock_requisitions(employee_id);
CREATE INDEX IF NOT EXISTS idx_stock_requisitions_status ON stock_requisitions(status);

CREATE TABLE IF NOT EXISTS stock_requisition_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES stock_requisitions(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    quantity INTEGER NOT NULL,
    CONSTRAINT chk_stock_requisition_lines_qty CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_requisition_lines_req ON stock_requisition_lines(requisition_id);
