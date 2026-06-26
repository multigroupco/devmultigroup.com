-- KVKK: stamp the processing moment (when/where) on each order for m.11 export
-- traceability. Store orders are processed on the CONTRACT basis (KVKK m.5/2-c)
-- — no açık rıza is required — but recording the source/channel keeps the audit
-- trail complete and consistent with the newsletter rıza kaydı.
--
-- SQLite ALTER ADD COLUMN allows only CONSTANT defaults, so consent_at has no
-- default (set explicitly by the reserve() insert); the text columns get
-- constant string defaults so existing rows backfill cleanly.
ALTER TABLE orders ADD COLUMN consent_at INTEGER;
ALTER TABLE orders ADD COLUMN consent_source TEXT NOT NULL DEFAULT 'web_form';
ALTER TABLE orders ADD COLUMN consent_channel TEXT NOT NULL DEFAULT 'web';
