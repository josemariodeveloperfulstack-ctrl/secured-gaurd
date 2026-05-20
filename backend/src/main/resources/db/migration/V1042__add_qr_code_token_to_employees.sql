-- V1042: QR Code do funcionário
-- Adiciona um token opaco, único e aleatório por funcionário, usado pelo Supervisor
-- para identificar o colaborador alocado no posto durante uma visita.
--
-- Decisão de design:
--  - O token é OPACO (não carrega significado), gerado pelo backend.
--  - O QR impresso pode trazer também Nome/CPF/Cargo/Posto para leitura humana,
--    mas a autenticação no backend usa apenas este token.
--  - Mantemos `registration_number` (matrícula) como fallback manual junto com o CPF.

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64);

-- Índice único parcial: só obriga unicidade quando o token estiver preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_qr_code_token
    ON employees (qr_code_token)
    WHERE qr_code_token IS NOT NULL;

-- Índice auxiliar para fallback por matrícula (já existe a coluna, mas não tinha índice rápido)
CREATE INDEX IF NOT EXISTS idx_employees_registration_number
    ON employees (registration_number)
    WHERE registration_number IS NOT NULL;

COMMENT ON COLUMN employees.qr_code_token IS
    'Token opaco usado pelo Supervisor para identificar o funcionário via leitura de QR Code. Gerado por EmployeeQrCodeService.';
