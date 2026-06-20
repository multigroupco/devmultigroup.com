-- Total runtime of a recording (playlist sum or single video), in minutes.
-- Editable in /admin; pre-filled by scripts/recordings-durations.sql.
ALTER TABLE recordings ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 0;
