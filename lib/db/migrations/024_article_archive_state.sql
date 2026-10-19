-- Migration 024: Safe article archive state + delete safety
-- Additive only. No drops, no rewrites, no destructive changes.
--
-- The dashboard's "Delete" action archives an article rather than removing
-- it, so analytics, revenue attribution, and related-article relationships
-- survive. This migration records every archive action so the owner can
-- see what was archived and when, without consulting the article row
-- directly. The allowed status set is enforced in the API layer
-- (app/api/articles/[id]/route.ts VALID_STATUSES) rather than via a new
-- CHECK constraint, because existing production rows may carry legacy
-- status values that a constraint would reject.

BEGIN;

-- Audit record for every archive action. article_id uses ON DELETE SET NULL
-- so the log survives even if the article is later removed.
CREATE TABLE IF NOT EXISTS article_archive_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE SET NULL,
  archived_by TEXT,
  previous_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_archive_log_article ON article_archive_log(article_id);

COMMIT;