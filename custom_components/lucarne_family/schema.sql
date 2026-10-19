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
    points INTEGER NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 1000),
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

-- Rows are never UPDATEd or DELETEd except member_slug on rename.
CREATE TABLE IF NOT EXISTS points_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    member_slug TEXT NOT NULL,
    delta INTEGER NOT NULL CHECK (delta <> 0),
    kind TEXT NOT NULL CHECK (kind IN ('earn','revoke','grant','streak_daily',
                                       'streak_milestone','claim_reserve','claim_release')),
    item_uid TEXT,
    cycle TEXT,
    reverses_id INTEGER REFERENCES points_ledger(id),
    claim_id INTEGER,
    idem_key TEXT,
    summary TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '' CHECK (length(reason) <= 200),
    actor_user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_member ON points_ledger(member_slug);
CREATE INDEX IF NOT EXISTS idx_ledger_item ON points_ledger(item_uid, id) WHERE item_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_reverses ON points_ledger(reverses_id) WHERE reverses_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_idem ON points_ledger(member_slug, idem_key) WHERE idem_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_claim ON points_ledger(claim_id, member_slug, kind) WHERE claim_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    cost INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 100000),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
    poolable INTEGER NOT NULL DEFAULT 0 CHECK (poolable IN (0,1)),
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rewards_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    streak_daily_bonus INTEGER NOT NULL DEFAULT 0,
    streak_milestones TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS streak_bonus_state (
    member_slug TEXT PRIMARY KEY,
    last_streak INTEGER NOT NULL,
    last_run_start TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_id INTEGER NOT NULL REFERENCES rewards(id),
    reward_name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    claimer_slug TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled','refunded')),
    created_at TEXT NOT NULL,
    created_by TEXT,
    resolved_at TEXT,
    resolved_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status, id);
CREATE TABLE IF NOT EXISTS claim_contributors (
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    member_slug TEXT NOT NULL,
    share INTEGER NOT NULL CHECK (share > 0),
    PRIMARY KEY (claim_id, member_slug)
);
CREATE INDEX IF NOT EXISTS idx_claim_contributors_member ON claim_contributors(member_slug);
