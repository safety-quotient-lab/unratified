package daemon

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/budget"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/runner"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/store"
)

// ScheduleTask defines a recurring task.
type ScheduleTask struct {
	Repo     string `json:"repo"`
	Prompt   string `json:"prompt"`
	Interval int    `json:"interval_seconds"`
}

// Config holds daemon configuration.
type Config struct {
	Port          int
	Secret        string
	Schedule      []ScheduleTask
	BuildVerify   bool
}

// Daemon orchestrates the HTTP server and scheduler.
type Daemon struct {
	cfg      Config
	runner   *runner.Runner
	budget   *budget.Checker
	store    *store.Store
	schedule map[string]time.Time // "repo:prompt" -> next run
	log      *slog.Logger
}

// New creates a daemon.
func New(cfg Config, r *runner.Runner, b *budget.Checker, s *store.Store, log *slog.Logger) *Daemon {
	return &Daemon{
		cfg:      cfg,
		runner:   r,
		budget:   b,
		store:    s,
		schedule: make(map[string]time.Time),
		log:      log,
	}
}

// ListenAndServe starts the HTTP server and scheduler.
func (d *Daemon) ListenAndServe() error {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", d.handleHealth)
	mux.HandleFunc("GET /activity", d.handleActivity)
	mux.HandleFunc("GET /sessions", d.handleSessions)
	mux.HandleFunc("GET /pause", d.handlePause)
	mux.HandleFunc("GET /resume", d.handleResume)
	mux.HandleFunc("POST /trigger", d.handleTrigger)
	mux.HandleFunc("POST /", d.handleWebhook)

	// Start scheduler
	if len(d.cfg.Schedule) > 0 {
		d.initSchedule()
		go d.schedulerLoop()
	}

	addr := fmt.Sprintf("127.0.0.1:%d", d.cfg.Port)
	d.log.Info("listening", "addr", addr)
	d.log.Info("endpoints",
		"webhook", "POST /",
		"trigger", "POST /trigger",
		"health", "GET /health",
		"activity", "GET /activity",
		"sessions", "GET /sessions",
		"pause", "GET /pause",
		"resume", "GET /resume",
	)

	return http.ListenAndServe(addr, mux)
}

func (d *Daemon) checkAuth(w http.ResponseWriter, r *http.Request) bool {
	if d.cfg.Secret == "" {
		return true
	}
	auth := r.Header.Get("Authorization")
	if auth == fmt.Sprintf("Bearer %s", d.cfg.Secret) {
		return true
	}
	d.log.Warn("unauthorized", "path", r.URL.Path, "remote", r.RemoteAddr)
	http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
	return false
}

func (d *Daemon) handleHealth(w http.ResponseWriter, r *http.Request) {
	repos := d.runner.Repos()
	bs := d.budget.Status(repos)

	scheduleInfo := make([]map[string]any, len(d.cfg.Schedule))
	for i, t := range d.cfg.Schedule {
		key := fmt.Sprintf("%s:%s", t.Repo, t.Prompt)
		nextRun := "pending"
		if nr, ok := d.schedule[key]; ok {
			nextRun = nr.Format(time.RFC3339)
		}
		scheduleInfo[i] = map[string]any{
			"repo":     t.Repo,
			"prompt":   t.Prompt,
			"interval": t.Interval,
			"next_run": nextRun,
		}
	}

	status := map[string]any{
		"status":           statusStr(bs.Paused),
		"paused":           bs.Paused,
		"in_flight":        bs.InFlight,
		"queued":           bs.Queued,
		"budget": map[string]any{
			"daily_used":  bs.DailyUsed,
			"daily_max":   bs.DailyMax,
			"hourly_max":  bs.HourlyMax,
			"hourly_used": bs.HourlyUsed,
		},
		"timeout_seconds":  bs.TimeoutSecs,
		"cooldown_seconds": bs.CooldownSecs,
		"cooldowns":        bs.Cooldowns,
		"schedule":         scheduleInfo,
		"build_verify":     d.cfg.BuildVerify,
		"repos":            repos,
		"timestamp":        time.Now().Format(time.RFC3339),
	}

	writeJSON(w, http.StatusOK, status)
}

func (d *Daemon) handleActivity(w http.ResponseWriter, r *http.Request) {
	qs := r.URL.Query()
	repo := qs.Get("repo")
	event := qs.Get("event")
	limit := intParam(qs, "n", 50)

	events, err := d.store.Activity(limit, repo, event)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (d *Daemon) handleSessions(w http.ResponseWriter, r *http.Request) {
	if !d.checkAuth(w, r) {
		return
	}
	sessions, err := d.store.Sessions(20)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, sessions)
}

func (d *Daemon) handlePause(w http.ResponseWriter, r *http.Request) {
	if !d.checkAuth(w, r) {
		return
	}
	if err := d.budget.Pause(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	d.log.Warn("PAUSED via /pause endpoint")
	w.Write([]byte("Paused.\n"))
}

func (d *Daemon) handleResume(w http.ResponseWriter, r *http.Request) {
	if !d.checkAuth(w, r) {
		return
	}
	if err := d.budget.Unpause(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	d.log.Info("RESUMED via /resume endpoint")
	w.Write([]byte("Resumed.\n"))
}

func (d *Daemon) handleTrigger(w http.ResponseWriter, r *http.Request) {
	if !d.checkAuth(w, r) {
		return
	}

	var payload struct {
		Repo   string `json:"repo"`
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return
	}

	if payload.Prompt == "" {
		payload.Prompt = "/sync"
	}

	if !runner.AllowedPrompts[payload.Prompt] {
		allowed := make([]string, 0, len(runner.AllowedPrompts))
		for k := range runner.AllowedPrompts {
			allowed = append(allowed, k)
		}
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error":   "prompt not allowed",
			"allowed": allowed,
		})
		return
	}

	if d.runner.RepoPath(payload.Repo) == "" {
		writeJSON(w, http.StatusNotFound, map[string]any{
			"error": fmt.Sprintf("unknown repo: %s", payload.Repo),
		})
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{
		"status": "accepted",
		"repo":   payload.Repo,
		"prompt": payload.Prompt,
	})

	go d.runner.Trigger(payload.Repo, payload.Prompt, "manual trigger via /trigger")
}

func (d *Daemon) handleWebhook(w http.ResponseWriter, r *http.Request) {
	body := make([]byte, r.ContentLength)
	r.Body.Read(body)

	// Verify GitHub signature
	if d.cfg.Secret != "" {
		sig := r.Header.Get("X-Hub-Signature-256")
		if !verifySignature(body, sig, d.cfg.Secret) {
			d.log.Warn("invalid signature", "remote", r.RemoteAddr)
			http.Error(w, "", http.StatusForbidden)
			return
		}
	}

	eventType := r.Header.Get("X-GitHub-Event")
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)

	if eventType != "pull_request" {
		return
	}

	action, _ := payload["action"].(string)
	if action != "opened" && action != "synchronize" && action != "reopened" {
		return
	}

	repoObj, _ := payload["repository"].(map[string]any)
	repoName, _ := repoObj["name"].(string)

	prObj, _ := payload["pull_request"].(map[string]any)
	headObj, _ := prObj["head"].(map[string]any)
	branch, _ := headObj["ref"].(string)
	prNumber, _ := payload["number"].(float64)
	prTitle, _ := prObj["title"].(string)

	d.store.Emit(store.Event{
		Type:   "webhook",
		Repo:   repoName,
		Detail: fmt.Sprintf("PR #%d %s: %s", int(prNumber), action, prTitle),
		Branch: branch,
	})

	// Only trigger for agent branches
	if !containsIgnoreCase(branch, "agent") {
		d.log.Info("ignoring non-agent PR", "repo", repoName, "branch", branch, "pr", int(prNumber))
		d.store.Emit(store.Event{Type: "skipped", Repo: repoName, Detail: fmt.Sprintf("non-agent branch: %s", branch)})
		return
	}

	if d.runner.RepoPath(repoName) == "" {
		d.log.Warn("no clone path for repo", "repo", repoName)
		d.store.Emit(store.Event{Type: "skipped", Repo: repoName, Detail: "no clone path configured"})
		return
	}

	go d.runner.Trigger(repoName, "/sync", fmt.Sprintf("PR #%d: %s", int(prNumber), prTitle))
}

// --- Scheduler ---

func (d *Daemon) initSchedule() {
	now := time.Now()
	for i, task := range d.cfg.Schedule {
		key := fmt.Sprintf("%s:%s", task.Repo, task.Prompt)
		// Stagger by 5 minutes, first run after 60s
		d.schedule[key] = now.Add(time.Duration(60+i*300) * time.Second)
		d.log.Info("scheduled",
			"repo", task.Repo,
			"prompt", task.Prompt,
			"interval", fmt.Sprintf("%ds", task.Interval),
			"first_run", d.schedule[key].Format("15:04:05"),
		)
	}
}

func (d *Daemon) schedulerLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if d.budget.Paused() {
			continue
		}

		now := time.Now()
		for _, task := range d.cfg.Schedule {
			key := fmt.Sprintf("%s:%s", task.Repo, task.Prompt)
			nextRun, ok := d.schedule[key]
			if !ok || now.Before(nextRun) {
				continue
			}

			if d.runner.RepoPath(task.Repo) == "" {
				d.log.Warn("scheduler: skipping", "repo", task.Repo, "reason", "path missing")
				d.schedule[key] = now.Add(time.Duration(task.Interval) * time.Second)
				continue
			}

			d.store.Emit(store.Event{
				Type:   "scheduled",
				Repo:   task.Repo,
				Detail: fmt.Sprintf("%s (every %ds)", task.Prompt, task.Interval),
			})

			// Advance schedule BEFORE triggering
			d.schedule[key] = now.Add(time.Duration(task.Interval) * time.Second)
			go d.runner.Trigger(task.Repo, task.Prompt, fmt.Sprintf("scheduled (%ds)", task.Interval))
		}
	}
}

// Schedule returns the current schedule state for display.
func (d *Daemon) Schedule() map[string]time.Time {
	return d.schedule
}

// --- Helpers ---

func verifySignature(body []byte, signature, secret string) bool {
	if len(signature) < 8 || signature[:7] != "sha256=" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

func containsIgnoreCase(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := range len(substr) {
			sc := s[i+j]
			uc := substr[j]
			if sc >= 'A' && sc <= 'Z' {
				sc += 32
			}
			if uc >= 'A' && uc <= 'Z' {
				uc += 32
			}
			if sc != uc {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func intParam(qs url.Values, key string, def int) int {
	v := qs.Get(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func statusStr(paused bool) string {
	if paused {
		return "paused"
	}
	return "ok"
}
