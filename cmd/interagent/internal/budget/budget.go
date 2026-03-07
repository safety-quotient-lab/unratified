package budget

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/store"
)

// Config holds budget/rate-limit settings.
type Config struct {
	MaxSyncsPerHour  int
	MaxSyncsPerDay   int
	CooldownSeconds  int
	TimeoutSeconds   int
	PauseFile        string
}

// DefaultConfig returns production defaults.
func DefaultConfig() Config {
	return Config{
		MaxSyncsPerHour:  6,
		MaxSyncsPerDay:   30,
		CooldownSeconds:  300,
		TimeoutSeconds:   1200,
		PauseFile:        os.ExpandEnv("$HOME/INTERAGENT_PAUSE"),
	}
}

// Checker evaluates whether a sync run may proceed.
type Checker struct {
	cfg      Config
	store    *store.Store
	inFlight map[string]int // repo -> PID
	queue    map[string]QueuedJob
	mu       sync.Mutex
}

// QueuedJob represents a pending job waiting for in-flight to finish.
type QueuedJob struct {
	Prompt string
	Reason string
}

// Status holds current budget state for display.
type Status struct {
	Paused        bool              `json:"paused"`
	DailyUsed     int               `json:"daily_used"`
	DailyMax      int               `json:"daily_max"`
	HourlyMax     int               `json:"hourly_max"`
	HourlyUsed    map[string]int    `json:"hourly_used"`
	Cooldowns     map[string]int    `json:"cooldowns"`
	InFlight      map[string]int    `json:"in_flight"`
	Queued        map[string]string `json:"queued"`
	TimeoutSecs   int               `json:"timeout_seconds"`
	CooldownSecs  int               `json:"cooldown_seconds"`
}

// New creates a budget checker.
func New(cfg Config, s *store.Store) *Checker {
	return &Checker{
		cfg:      cfg,
		store:    s,
		inFlight: make(map[string]int),
		queue:    make(map[string]QueuedJob),
	}
}

// Paused returns whether the kill switch file exists.
func (c *Checker) Paused() bool {
	_, err := os.Stat(c.cfg.PauseFile)
	return err == nil
}

// Pause creates the kill switch file.
func (c *Checker) Pause() error {
	f, err := os.Create(c.cfg.PauseFile)
	if err != nil {
		return err
	}
	return f.Close()
}

// Unpause removes the kill switch file.
func (c *Checker) Unpause() error {
	err := os.Remove(c.cfg.PauseFile)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// Check returns nil if the repo may run, or a reason string if blocked.
func (c *Checker) Check(repo string) error {
	if c.Paused() {
		return fmt.Errorf("PAUSED (kill switch active: %s)", c.cfg.PauseFile)
	}

	// Daily budget
	dailyCount, err := c.store.DailyCount()
	if err != nil {
		return fmt.Errorf("check daily count: %w", err)
	}
	if dailyCount >= c.cfg.MaxSyncsPerDay {
		return fmt.Errorf("daily budget exhausted (%d/%d)", dailyCount, c.cfg.MaxSyncsPerDay)
	}

	// Hourly rate limit
	hourlyCount, err := c.store.SyncCountSince(repo, time.Now().Add(-time.Hour))
	if err != nil {
		return fmt.Errorf("check hourly count: %w", err)
	}
	if hourlyCount >= c.cfg.MaxSyncsPerHour {
		return fmt.Errorf("hourly rate limit for %s (%d/%d)", repo, hourlyCount, c.cfg.MaxSyncsPerHour)
	}

	// In-flight dedup
	c.mu.Lock()
	pid, running := c.inFlight[repo]
	c.mu.Unlock()
	if running {
		return fmt.Errorf("sync already in flight for %s (PID %d)", repo, pid)
	}

	// Cooldown
	lastSync, err := c.store.LastSyncTime(repo)
	if err != nil {
		return fmt.Errorf("check last sync: %w", err)
	}
	if !lastSync.IsZero() {
		elapsed := time.Since(lastSync)
		cooldown := time.Duration(c.cfg.CooldownSeconds) * time.Second
		if elapsed < cooldown {
			remaining := int((cooldown - elapsed).Seconds())
			return fmt.Errorf("cooldown for %s (%ds remaining of %ds)", repo, remaining, c.cfg.CooldownSeconds)
		}
	}

	return nil
}

// IsInFlight returns true if a run occupies this repo.
func (c *Checker) IsInFlight(repo string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, ok := c.inFlight[repo]
	return ok
}

// SetInFlight marks a repo as occupied by a process.
func (c *Checker) SetInFlight(repo string, pid int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.inFlight[repo] = pid
}

// ClearInFlight removes the in-flight marker for a repo.
func (c *Checker) ClearInFlight(repo string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.inFlight, repo)
}

// Enqueue stores a pending job for a repo (latest wins).
func (c *Checker) Enqueue(repo string, prompt, reason string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.queue[repo] = QueuedJob{Prompt: prompt, Reason: reason}
}

// Dequeue removes and returns the queued job for a repo, if any.
func (c *Checker) Dequeue(repo string) (QueuedJob, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	job, ok := c.queue[repo]
	if ok {
		delete(c.queue, repo)
	}
	return job, ok
}

// Status returns current budget state for API/TUI display.
func (c *Checker) Status(repos []string) Status {
	dailyUsed, _ := c.store.DailyCount()
	hourlyUsed := make(map[string]int)
	cooldowns := make(map[string]int)

	for _, repo := range repos {
		count, _ := c.store.SyncCountSince(repo, time.Now().Add(-time.Hour))
		hourlyUsed[repo] = count

		lastSync, _ := c.store.LastSyncTime(repo)
		if !lastSync.IsZero() {
			remaining := c.cfg.CooldownSeconds - int(time.Since(lastSync).Seconds())
			if remaining > 0 {
				cooldowns[repo] = remaining
			}
		}
	}

	c.mu.Lock()
	inFlight := make(map[string]int)
	for k, v := range c.inFlight {
		inFlight[k] = v
	}
	queued := make(map[string]string)
	for k, v := range c.queue {
		queued[k] = v.Prompt
	}
	c.mu.Unlock()

	return Status{
		Paused:       c.Paused(),
		DailyUsed:    dailyUsed,
		DailyMax:     c.cfg.MaxSyncsPerDay,
		HourlyMax:    c.cfg.MaxSyncsPerHour,
		HourlyUsed:   hourlyUsed,
		Cooldowns:    cooldowns,
		InFlight:     inFlight,
		Queued:       queued,
		TimeoutSecs:  c.cfg.TimeoutSeconds,
		CooldownSecs: c.cfg.CooldownSeconds,
	}
}

// Config returns the checker's configuration.
func (c *Checker) Config() Config {
	return c.cfg
}
