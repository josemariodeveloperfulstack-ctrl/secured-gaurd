ALTER TABLE interaction_history ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_interaction_history_lead_id ON interaction_history(lead_id);
