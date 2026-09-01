CREATE TABLE profiles (
	id TEXT PRIMARY KEY,
	full_name TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE reports (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	category TEXT NOT NULL,
	severity TEXT NOT NULL,
	description TEXT NOT NULL,
	station_name TEXT,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	additional_details TEXT
);

CREATE INDEX idx_reports_user_id ON reports (user_id);
CREATE INDEX idx_reports_station_name ON reports (station_name);
CREATE INDEX idx_reports_created_at ON reports (created_at);
CREATE INDEX idx_reports_category_created_at ON reports (category, created_at);

CREATE TABLE report_updates (
	id TEXT PRIMARY KEY,
	report_id TEXT NOT NULL REFERENCES reports (id),
	status TEXT NOT NULL,
	message TEXT,
	created_at TEXT NOT NULL
);

CREATE INDEX idx_report_updates_report_id ON report_updates (report_id);
