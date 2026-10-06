-- Add unique constraint to prevent duplicate decisions
ALTER TABLE brain_decisions ADD CONSTRAINT brain_decisions_type_title_rationale_key UNIQUE (type, title, rationale);