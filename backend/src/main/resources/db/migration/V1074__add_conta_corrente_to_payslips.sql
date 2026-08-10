-- Adiciona a coluna conta_corrente na tabela payslips
-- Permite verificar se a conta corrente do holerite confere com a conta creditada no comprovante
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS conta_corrente VARCHAR(50);
