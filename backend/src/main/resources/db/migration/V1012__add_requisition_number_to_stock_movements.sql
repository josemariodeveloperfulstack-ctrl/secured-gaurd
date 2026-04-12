-- Número da requisição de inventário físico (mesmo valor em todas as linhas de um mesmo import)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS requisition_number VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_stock_movements_requisition_number ON stock_movements(requisition_number);
