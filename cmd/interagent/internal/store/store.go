package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

// Event represents an activity feed entry.
type Event struct {
	ID        int64     `json:"id"`
	Timestamp time.Time `json:"ts"`
	Type      string    `json:"event"`
	Repo      string    `json:"repo,omitempty"`
	Detail    string    `json:"detail,omitempty"`
	Prompt    string    `json:"prompt,omitempty"`
	Reason    string    `json:"reason,omitempty"`
	ExitCode  *int      `json:"exit_code,omitempty"`
	SessionID string    `json:"session_id,omitempty"`
	Resume    string    `json:"resume,omitempty"`
	Branch    string    `json:"branch,omitempty"`
	LogFile   string    `json:"log,omitempty"`
	Extra     string    `json:"extra,omitempty"` // JSON blob for anything else
}

// Session represents a resumable Claude Code session.
type Session struct {
	ID        int64     `json:"id"`
	Repo      string    `json:"repo"`
	SessionID string    `json:"session_id"`
	Prompt    string    `json:"prompt"`
	ExitCode  int       `json:"exit_code"`
	Resume    string    `json:"resume"`
	LogFile   string    `json:"log"`
	CreatedAt time.Time `json:"created_at"`
}

// BudgetState tracks daily/hourly counters persisted across restarts.
type BudgetState struct {
	DailyCount int       `json:"daily_count"`
	DailyReset time.Time `json:"daily_reset"`
}

// Store wraps SQLite for persistent state.
type Store struct {
	db *sql.DB
	mu sync.Mutex
}

// DefaultPath returns the default database path.
func DefaultPath() string {
	return filepath.Join("~/.config/interagent", "interagent.db")
}

// Open creates or opens the SQLite database.
func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := migrate(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return &Store{db: db}, nil
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS events (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			ts         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
			event      TEXT NOT NULL,
			repo       TEXT NOT NULL DEFAULT '',
			detail     TEXT NOT NULL DEFAULT '',
			prompt     TEXT NOT NULL DEFAULT '',
			reason     TEXT NOT NULL DEFAULT '',
			exit_code  INTEGER,
			session_id TEXT NOT NULL DEFAULT '',
			resume     TEXT NOT NULL DEFAULT '',
			branch     TEXT NOT NULL DEFAULT '',
			log_file   TEXT NOT NULL DEFAULT '',
			extra      TEXT NOT NULL DEFAULT ''
		);

		CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
		CREATE INDEX IF NOT EXISTS idx_events_repo ON events(repo);
		CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);

		CREATE TABLE IF NOT EXISTS budget (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS sync_times (
			id   INTEGER PRIMARY KEY AUTOINCREMENT,
			repo TEXT NOT NULL,
			ts   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
		);

		CREATE INDEX IF NOT EXISTS idx_sync_times_repo ON sync_times(repo);

		CREATE TABLE IF NOT EXISTS feedback_decisions (
			id                  INTEGER PRIMARY KEY AUTOINCREMENT,
			ts                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
			scan_turn           INTEGER NOT NULL,
			finding_id          TEXT NOT NULL,
			dimension           TEXT NOT NULL,
			severity            TEXT NOT NULL,
			scanner_confidence  REAL NOT NULL,
			decision            TEXT NOT NULL,
			reasoning           TEXT NOT NULL DEFAULT '',
			action_taken        TEXT NOT NULL DEFAULT '',
			convergence         INTEGER NOT NULL DEFAULT 0
		);

		CREATE INDEX IF NOT EXISTS idx_fd_dimension ON feedback_decisions(dimension);
		CREATE INDEX IF NOT EXISTS idx_fd_decision ON feedback_decisions(decision);
	`)
	return err
}

// Emit records an event.
func (s *Store) Emit(e Event) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if e.Timestamp.IsZero() {
		e.Timestamp = time.Now()
	}

	var exitCode *int
	if e.ExitCode != nil {
		exitCode = e.ExitCode
	}

	res, err := s.db.Exec(
		`INSERT INTO events (ts, event, repo, detail, prompt, reason, exit_code, session_id, resume, branch, log_file, extra)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.Timestamp.Format(time.RFC3339),
		e.Type, e.Repo, e.Detail, e.Prompt, e.Reason,
		exitCode, e.SessionID, e.Resume, e.Branch, e.LogFile, e.Extra,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// Activity returns recent events, optionally filtered.
func (s *Store) Activity(limit int, repo, eventType string) ([]Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	query := `SELECT id, ts, event, repo, detail, prompt, reason, exit_code, session_id, resume, branch, log_file, extra FROM events WHERE 1=1`
	args := []any{}

	if repo != "" {
		query += ` AND repo = ?`
		args = append(args, repo)
	}
	if eventType != "" {
		query += ` AND event = ?`
		args = append(args, eventType)
	}

	query += ` ORDER BY id DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var ts string
		var exitCode *int
		err := rows.Scan(&e.ID, &ts, &e.Type, &e.Repo, &e.Detail, &e.Prompt,
			&e.Reason, &exitCode, &e.SessionID, &e.Resume, &e.Branch, &e.LogFile, &e.Extra)
		if err != nil {
			return nil, err
		}
		e.Timestamp, _ = parseFlexTime(ts)
		e.ExitCode = exitCode
		events = append(events, e)
	}

	// Reverse so oldest first (like the Python version)
	for i, j := 0, len(events)-1; i < j; i, j = i+1, j-1 {
		events[i], events[j] = events[j], events[i]
	}

	return events, nil
}

// Sessions returns recent sessions with resume capability.
func (s *Store) Sessions(limit int) ([]Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(
		`SELECT id, ts, event, repo, detail, prompt, reason, exit_code, session_id, resume, branch, log_file, extra
		 FROM events
		 WHERE event = 'run_done' AND session_id != ''
		 ORDER BY id DESC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var ts string
		var exitCode *int
		err := rows.Scan(&e.ID, &ts, &e.Type, &e.Repo, &e.Detail, &e.Prompt,
			&e.Reason, &exitCode, &e.SessionID, &e.Resume, &e.Branch, &e.LogFile, &e.Extra)
		if err != nil {
			return nil, err
		}
		e.Timestamp, _ = time.Parse(time.RFC3339, ts)
		e.ExitCode = exitCode
		events = append(events, e)
	}

	// Reverse so oldest first
	for i, j := 0, len(events)-1; i < j; i, j = i+1, j-1 {
		events[i], events[j] = events[j], events[i]
	}

	return events, nil
}

// RecordSync adds a sync timestamp for rate limiting.
func (s *Store) RecordSync(repo string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`INSERT INTO sync_times (repo, ts) VALUES (?, ?)`,
		repo, time.Now().Format(time.RFC3339))
	return err
}

// SyncCountSince returns how many syncs happened for a repo since the given time.
func (s *Store) SyncCountSince(repo string, since time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM sync_times WHERE repo = ? AND ts >= ?`,
		repo, since.Format(time.RFC3339),
	).Scan(&count)
	return count, err
}

// LastSyncTime returns the most recent sync time for a repo.
func (s *Store) LastSyncTime(repo string) (time.Time, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var ts string
	err := s.db.QueryRow(
		`SELECT ts FROM sync_times WHERE repo = ? ORDER BY id DESC LIMIT 1`,
		repo,
	).Scan(&ts)
	if err == sql.ErrNoRows {
		return time.Time{}, nil
	}
	if err != nil {
		return time.Time{}, err
	}
	return parseFlexTime(ts)
}

// DailyCount returns total syncs today.
func (s *Store) DailyCount() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM sync_times WHERE ts >= ?`,
		today+"T00:00:00",
	).Scan(&count)
	return count, err
}

// PruneSyncTimes removes sync timestamps older than the given duration.
func (s *Store) PruneSyncTimes(olderThan time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-olderThan).Format(time.RFC3339)
	_, err := s.db.Exec(`DELETE FROM sync_times WHERE ts < ?`, cutoff)
	return err
}

// GetBudget retrieves a budget value.
func (s *Store) GetBudget(key string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var val string
	err := s.db.QueryRow(`SELECT value FROM budget WHERE key = ?`, key).Scan(&val)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return val, err
}

// SetBudget stores a budget value.
func (s *Store) SetBudget(key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(
		`INSERT INTO budget (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
		key, value, value,
	)
	return err
}

// FeedbackDecision represents one accept/reject/defer decision on a scan finding.
type FeedbackDecision struct {
	ID                 int64   `json:"id"`
	Timestamp          string  `json:"ts"`
	ScanTurn           int     `json:"scan_turn"`
	FindingID          string  `json:"finding_id"`
	Dimension          string  `json:"dimension"`
	Severity           string  `json:"severity"`
	ScannerConfidence  float64 `json:"scanner_confidence"`
	Decision           string  `json:"decision"` // accept, reject, defer
	Reasoning          string  `json:"reasoning,omitempty"`
	ActionTaken        string  `json:"action_taken,omitempty"`
	Convergence        bool    `json:"convergence"`
}

// RecordDecision stores a feedback decision.
func (s *Store) RecordDecision(d FeedbackDecision) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	conv := 0
	if d.Convergence {
		conv = 1
	}
	_, err := s.db.Exec(
		`INSERT INTO feedback_decisions (scan_turn, finding_id, dimension, severity, scanner_confidence, decision, reasoning, action_taken, convergence)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		d.ScanTurn, d.FindingID, d.Dimension, d.Severity, d.ScannerConfidence,
		d.Decision, d.Reasoning, d.ActionTaken, conv,
	)
	return err
}

// CalibrationRow holds aggregated stats for one dimension+severity bucket.
type CalibrationRow struct {
	Dimension   string  `json:"dimension"`
	Severity    string  `json:"severity"`
	Total       int     `json:"total"`
	Accepted    int     `json:"accepted"`
	Rejected    int     `json:"rejected"`
	Deferred    int     `json:"deferred"`
	AcceptRate  float64 `json:"accept_rate"`
	AvgConfidence float64 `json:"avg_scanner_confidence"`
}

// CalibrationStats returns accept/reject rates grouped by dimension and severity.
func (s *Store) CalibrationStats() ([]CalibrationRow, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`
		SELECT
			dimension,
			severity,
			COUNT(*) as total,
			SUM(CASE WHEN decision = 'accept' THEN 1 ELSE 0 END) as accepted,
			SUM(CASE WHEN decision = 'reject' THEN 1 ELSE 0 END) as rejected,
			SUM(CASE WHEN decision = 'defer' THEN 1 ELSE 0 END) as deferred,
			AVG(scanner_confidence) as avg_confidence
		FROM feedback_decisions
		GROUP BY dimension, severity
		ORDER BY dimension, severity
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []CalibrationRow
	for rows.Next() {
		var r CalibrationRow
		if err := rows.Scan(&r.Dimension, &r.Severity, &r.Total, &r.Accepted, &r.Rejected, &r.Deferred, &r.AvgConfidence); err != nil {
			return nil, err
		}
		if r.Total > 0 {
			r.AcceptRate = float64(r.Accepted) / float64(r.Total)
		}
		stats = append(stats, r)
	}
	return stats, nil
}

// RecentDecisions returns the N most recent feedback decisions.
func (s *Store) RecentDecisions(limit int) ([]FeedbackDecision, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(
		`SELECT id, ts, scan_turn, finding_id, dimension, severity, scanner_confidence, decision, reasoning, action_taken, convergence
		 FROM feedback_decisions ORDER BY id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var decisions []FeedbackDecision
	for rows.Next() {
		var d FeedbackDecision
		var conv int
		if err := rows.Scan(&d.ID, &d.Timestamp, &d.ScanTurn, &d.FindingID, &d.Dimension, &d.Severity, &d.ScannerConfidence, &d.Decision, &d.Reasoning, &d.ActionTaken, &conv); err != nil {
			return nil, err
		}
		d.Convergence = conv != 0
		decisions = append(decisions, d)
	}
	return decisions, nil
}

// Close closes the database.
func (s *Store) Close() error {
	return s.db.Close()
}

// parseFlexTime parses RFC3339 timestamps, falling back to the bare
// "2006-01-02T15:04:05" format that SQLite's strftime default produces.
func parseFlexTime(ts string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, ts)
	if err != nil {
		t, err = time.ParseInLocation("2006-01-02T15:04:05", ts, time.Local)
	}
	return t, err
}

// MarshalEvent serializes an event to JSON.
func MarshalEvent(e Event) ([]byte, error) {
	return json.Marshal(e)
}
