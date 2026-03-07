package runner

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/budget"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/store"
)

// RepoConfig maps repo names to local clone paths.
type RepoConfig map[string]string

// AllowedPrompts lists prompts that can run via /trigger.
var AllowedPrompts = map[string]bool{
	"/sync":           true,
	"/hunt":           true,
	"/hunt quick":     true,
	"/hunt deep":      true,
	"/hunt content":   true,
	"/hunt integrity": true,
	"/cycle":          true,
	"/doc":            true,
}

// Runner manages claude process execution.
type Runner struct {
	repos  RepoConfig
	budget *budget.Checker
	store  *store.Store
	logDir string
	log    *slog.Logger
}

// New creates a runner.
func New(repos RepoConfig, b *budget.Checker, s *store.Store, logDir string, log *slog.Logger) *Runner {
	return &Runner{
		repos:  repos,
		budget: b,
		store:  s,
		logDir: logDir,
		log:    log,
	}
}

// Repos returns configured repo names.
func (r *Runner) Repos() []string {
	names := make([]string, 0, len(r.repos))
	for k := range r.repos {
		names = append(names, k)
	}
	return names
}

// RepoPath returns the local path for a repo, or empty string if unknown.
func (r *Runner) RepoPath(repo string) string {
	return r.repos[repo]
}

// Trigger attempts to run claude with the given prompt in the repo's directory.
// Runs asynchronously — returns immediately after spawning.
func (r *Runner) Trigger(repo, prompt, reason string) {
	clonePath, ok := r.repos[repo]
	if !ok {
		r.log.Warn("unknown repo", "repo", repo)
		r.store.Emit(store.Event{Type: "error", Repo: repo, Detail: "unknown repo"})
		return
	}

	if _, err := os.Stat(clonePath); os.IsNotExist(err) {
		r.log.Error("clone path missing", "repo", repo, "path", clonePath)
		r.store.Emit(store.Event{Type: "error", Repo: repo, Detail: fmt.Sprintf("clone path missing: %s", clonePath)})
		return
	}

	// Check budget
	if err := r.budget.Check(repo); err != nil {
		errMsg := err.Error()
		// If blocked because in-flight, queue instead of dropping
		if r.budget.IsInFlight(repo) && strings.Contains(errMsg, "in flight") {
			r.budget.Enqueue(repo, prompt, reason)
			r.log.Info("queued", "repo", repo, "prompt", prompt)
			r.store.Emit(store.Event{
				Type:   "queued",
				Repo:   repo,
				Detail: fmt.Sprintf("%s: %s (waiting for in-flight)", prompt, reason),
				Prompt: prompt,
				Reason: reason,
			})
		} else {
			r.log.Warn("blocked", "repo", repo, "prompt", prompt, "reason", errMsg)
			r.store.Emit(store.Event{
				Type:   "blocked",
				Repo:   repo,
				Detail: errMsg,
				Prompt: prompt,
				Reason: reason,
			})
		}
		return
	}

	r.log.Info("triggering", "repo", repo, "prompt", prompt, "reason", reason)
	r.store.Emit(store.Event{
		Type:   "run_start",
		Repo:   repo,
		Detail: reason,
		Prompt: prompt,
	})

	ts := time.Now().Format("20060102-150405")
	label := strings.ReplaceAll(strings.TrimLeft(prompt, "/"), " ", "-")
	logFile := filepath.Join(r.logDir, fmt.Sprintf("%s-%s-%s.log", repo, label, ts))

	go r.runClaude(repo, clonePath, prompt, reason, logFile)
}

func (r *Runner) runClaude(repo, clonePath, prompt, reason, logFile string) {
	f, err := os.Create(logFile)
	if err != nil {
		r.log.Error("create log file", "error", err)
		r.store.Emit(store.Event{Type: "error", Repo: repo, Detail: err.Error(), Prompt: prompt})
		return
	}

	cmd := exec.Command("claude", "-p", prompt,
		"--allowedTools", "Read,Edit,Write,Bash,Glob,Grep",
		"--output-format", "json",
	)
	cmd.Dir = clonePath
	cmd.Stdout = f
	cmd.Stderr = f

	// Build clean env without CLAUDECODE
	env := make([]string, 0, len(os.Environ()))
	for _, e := range os.Environ() {
		if !strings.HasPrefix(e, "CLAUDECODE=") {
			env = append(env, e)
		}
	}
	env = append(env, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1")
	cmd.Env = env

	if err := cmd.Start(); err != nil {
		f.Close()
		r.log.Error("start claude", "error", err, "repo", repo)
		r.store.Emit(store.Event{Type: "error", Repo: repo, Detail: err.Error(), Prompt: prompt})
		return
	}

	pid := cmd.Process.Pid
	r.budget.SetInFlight(repo, pid)
	r.store.RecordSync(repo)

	dailyCount, _ := r.store.DailyCount()
	hourlyCount, _ := r.store.SyncCountSince(repo, time.Now().Add(-time.Hour))
	r.log.Info("started claude",
		"pid", pid, "prompt", prompt, "repo", repo,
		"log", logFile,
		"daily", fmt.Sprintf("%d/%d", dailyCount, r.budget.Config().MaxSyncsPerDay),
		"hourly", fmt.Sprintf("%d/%d", hourlyCount, r.budget.Config().MaxSyncsPerHour),
	)

	// Wait with timeout
	timeout := time.Duration(r.budget.Config().TimeoutSeconds) * time.Second
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	var rc int
	select {
	case err := <-done:
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				rc = exitErr.ExitCode()
			} else {
				rc = 1
			}
		}
	case <-time.After(timeout):
		r.log.Error("timeout", "repo", repo, "prompt", prompt, "pid", pid, "timeout", timeout)
		r.store.Emit(store.Event{
			Type:   "timeout",
			Repo:   repo,
			Detail: fmt.Sprintf("killed PID %d after %s", pid, timeout),
			Prompt: prompt,
		})
		cmd.Process.Kill()
		<-done // Wait for process to actually exit
		rc = -9
	}

	f.Close()
	r.budget.ClearInFlight(repo)

	// Extract session ID from JSON output
	sessionID := extractSessionID(logFile)

	status := "OK"
	if rc != 0 {
		status = fmt.Sprintf("FAILED (exit %d)", rc)
	}

	resumeHint := ""
	if sessionID != "" {
		resumeHint = fmt.Sprintf("cd %s && claude --resume %s", clonePath, sessionID)
	}

	r.log.Info("finished", "repo", repo, "prompt", prompt, "status", status, "log", logFile)

	if rc != 0 && sessionID != "" {
		r.log.Warn("HUMAN TAKEOVER AVAILABLE", "repo", repo, "resume", resumeHint)
	}

	r.store.Emit(store.Event{
		Type:      "run_done",
		Repo:      repo,
		Detail:    status,
		Prompt:    prompt,
		ExitCode:  &rc,
		SessionID: sessionID,
		Resume:    resumeHint,
		LogFile:   logFile,
	})

	// Drain queue
	if job, ok := r.budget.Dequeue(repo); ok {
		r.log.Info("draining queue", "repo", repo, "prompt", job.Prompt)
		r.store.Emit(store.Event{
			Type:   "queue_drain",
			Repo:   repo,
			Detail: fmt.Sprintf("%s: %s", job.Prompt, job.Reason),
		})
		r.Trigger(repo, job.Prompt, fmt.Sprintf("queued: %s", job.Reason))
	}
}

func extractSessionID(logFile string) string {
	data, err := os.ReadFile(logFile)
	if err != nil {
		return ""
	}
	var output struct {
		SessionID string `json:"session_id"`
	}
	if err := json.Unmarshal(data, &output); err != nil {
		return ""
	}
	return output.SessionID
}
