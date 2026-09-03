CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_metadata (
    item_uid TEXT PRIMARY KEY NOT NULL,
    member_slug TEXT NOT NULL,
    assignee_slug TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('routine','chore','rotating')),
    recurrence TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','template','apple')),
    apple_uid TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    time_of_day TEXT NOT NULL DEFAULT 'anytime'
        CHECK (time_of_day IN ('anytime','morning','afternoon','night')),
    rotation_owners TEXT NOT NULL DEFAULT '',
    current_owner TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_metadata_member ON task_metadata(member_slug);
CREATE TABLE IF NOT EXISTS completion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    member_slug TEXT NOT NULL,
    item_uid TEXT NOT NULL,
    summary TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('completed','undone','reset')),
    recurrence_at_time TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_completion_log_member_ts ON completion_log(member_slug, timestamp DESC);
CREATE TABLE IF NOT EXISTS apple_sync_state (
    apple_uid TEXT PRIMARY KEY NOT NULL,
    member_slug TEXT NOT NULL,
    item_uid TEXT NOT NULL,
    last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_apple_sync_state_member ON apple_sync_state(member_slug);
