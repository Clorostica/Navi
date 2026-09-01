CREATE TABLE trusted_contacts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE INDEX idx_trusted_contacts_user_id ON trusted_contacts (user_id);

CREATE TABLE companion_sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	destination_label TEXT,
	started_at TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active', -- active | checked_in | alerted | cancelled
	last_lat REAL,
	last_lon REAL,
	last_location_at TEXT
);
CREATE INDEX idx_companion_sessions_user_id ON companion_sessions (user_id);
CREATE INDEX idx_companion_sessions_status_expires ON companion_sessions (status, expires_at);
