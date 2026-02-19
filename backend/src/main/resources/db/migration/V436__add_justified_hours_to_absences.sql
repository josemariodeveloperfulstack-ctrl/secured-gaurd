-- Horas justificadas na falta (quando não é atestado: apenas essas horas entram no cálculo)
ALTER TABLE absences ADD COLUMN IF NOT EXISTS justified_hours NUMERIC(4,2);
