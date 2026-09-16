CREATE TABLE report_comments (
	id TEXT PRIMARY KEY,
	report_id TEXT NOT NULL REFERENCES reports (id),
	user_id TEXT NOT NULL,
	author_name TEXT NOT NULL,
	body TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX idx_report_comments_report_id ON report_comments (report_id, created_at);
