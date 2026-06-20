-- Many-to-many link between events and recordings (a talk/playlist can cover
-- multiple events, and an event can have multiple recordings).
CREATE TABLE IF NOT EXISTS event_recordings (
  event_id     TEXT NOT NULL,
  recording_id TEXT NOT NULL,
  PRIMARY KEY (event_id, recording_id)
);
CREATE INDEX IF NOT EXISTS idx_event_recordings_event ON event_recordings (event_id);
CREATE INDEX IF NOT EXISTS idx_event_recordings_rec ON event_recordings (recording_id);
