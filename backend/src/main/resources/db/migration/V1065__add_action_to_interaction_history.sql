-- Entity InteractionHistory mapeia coluna "action"; tabela original só tinha note.
ALTER TABLE interaction_history
    ADD COLUMN IF NOT EXISTS action VARCHAR(100);

-- Oportunidade pode ser nula quando o histórico é só do lead.
ALTER TABLE interaction_history
    ALTER COLUMN opportunity_id DROP NOT NULL;
