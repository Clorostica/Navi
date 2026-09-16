ALTER TABLE reports ADD COLUMN visibility TEXT NOT NULL DEFAULT 'community';

CREATE TABLE report_confirmations (
	id TEXT PRIMARY KEY,
	report_id TEXT NOT NULL REFERENCES reports (id),
	user_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	UNIQUE (report_id, user_id)
);

CREATE INDEX idx_report_confirmations_report_id ON report_confirmations (report_id);
