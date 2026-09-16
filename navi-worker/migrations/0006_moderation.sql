ALTER TABLE profiles ADD COLUMN strikes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE report_flags (
	id TEXT PRIMARY KEY,
	report_id TEXT NOT NULL REFERENCES reports (id),
	user_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	UNIQUE (report_id, user_id)
);

CREATE INDEX idx_report_flags_report_id ON report_flags (report_id);
