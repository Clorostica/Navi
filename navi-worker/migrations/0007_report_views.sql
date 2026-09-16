CREATE TABLE report_views (
	id TEXT PRIMARY KEY,
	report_id TEXT NOT NULL REFERENCES reports (id),
	user_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	UNIQUE (report_id, user_id)
);

CREATE INDEX idx_report_views_report_id ON report_views (report_id);
