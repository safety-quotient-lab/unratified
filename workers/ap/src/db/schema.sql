-- ActivityPub: follower storage
CREATE TABLE IF NOT EXISTS ap_followers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_name TEXT NOT NULL,
  remote_actor_url TEXT NOT NULL,
  remote_inbox_url TEXT NOT NULL,
  shared_inbox_url TEXT,
  followed_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_delivery_at TEXT,
  delivery_failures INTEGER NOT NULL DEFAULT 0,
  UNIQUE(actor_name, remote_actor_url)
);

-- ActivityPub: outbox activity log
CREATE TABLE IF NOT EXISTS ap_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_name TEXT NOT NULL,
  activity_id TEXT NOT NULL UNIQUE,
  activity_type TEXT NOT NULL,
  object_json TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ap_followers_actor ON ap_followers(actor_name);
CREATE INDEX IF NOT EXISTS idx_ap_activities_actor ON ap_activities(actor_name, published_at DESC);
