-- Unratified site monitor — D1 schema
-- Migration 001: initial tables

CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  success INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  check_type TEXT NOT NULL,
  expected TEXT,
  actual TEXT,
  passed INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site TEXT NOT NULL,
  period TEXT NOT NULL,
  pageviews INTEGER,
  visits INTEGER,
  top_pages TEXT,
  top_referrers TEXT,
  countries TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  severity TEXT NOT NULL DEFAULT 'warning',
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_endpoint_time
  ON health_checks(endpoint, checked_at);

CREATE INDEX IF NOT EXISTS idx_content_endpoint_time
  ON content_checks(endpoint, checked_at);

CREATE INDEX IF NOT EXISTS idx_analytics_site_time
  ON analytics_snapshots(site, fetched_at);

CREATE INDEX IF NOT EXISTS idx_alerts_category_time
  ON alerts(category, created_at);
