package runner

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/budget"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/logbuf"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/store"
)

// RepoConfig maps repo names to local clone paths.
type RepoConfig map[string]string

// AllowedPrompts lists prompts that can run via /trigger.
var AllowedPrompts = map[string]bool{
	"/sync":              true,
	"/iterate":           true,
	"/iterate quick":     true,
	"/iterate deep":      true,
	"/hunt":              true,
	"/hunt quick":        true,
	"/hunt deep":         true,
	"/hunt content":      true,
	"/hunt integrity":    true,
	"/cycle":             true,
	"/doc":               true,
	"/scan-peer":         true,
	"/process-feedback":  true,
}

// IsPromptAllowed checks if a prompt matches an allowed entry.
// Supports exact match and prefix match (e.g. "/scan-peer unratified" matches "/scan-peer").
func IsPromptAllowed(prompt string) bool {
	if AllowedPrompts[prompt] {
		return true
	}
	// Check if the base command (before first space) matches
	if idx := strings.Index(prompt, " "); idx > 0 {
		return AllowedPrompts[prompt[:idx]]
	}
	return false
}

// Runner manages claude process execution.
type Runner struct {
	repos       RepoConfig
	budget      *budget.Checker
	store       *store.Store
	logs        *logbuf.Ring
	logDir      string
	log         *slog.Logger
	buildVerify bool
}

// New creates a runner.
func New(repos RepoConfig, b *budget.Checker, s *store.Store, logs *logbuf.Ring, logDir string, log *slog.Logger) *Runner {
	return &Runner{
		repos:  repos,
		budget: b,
		store:  s,
		logs:   logs,
		logDir: logDir,
		log:    log,
	}
}

// SetBuildVerify enables post-run build verification.
func (r *Runner) SetBuildVerify(enabled bool) {
	r.buildVerify = enabled
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

// Logs returns the shared log ring buffer.
func (r *Runner) Logs() *logbuf.Ring {
	return r.logs
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
		"--output-format", "stream-json",
		"--verbose",
	)
	cmd.Dir = clonePath

	// Pipe stdout so we can parse stream-json and tee to log file
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		f.Close()
		r.log.Error("stdout pipe", "error", err)
		r.store.Emit(store.Event{Type: "error", Repo: repo, Detail: err.Error(), Prompt: prompt})
		return
	}
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

	// Clear any previous log buffer and emit the prompt as the first line
	r.logs.Clear(repo)
	r.logs.Append(repo, logbuf.Line{
		Text: fmt.Sprintf("> %s  [%s in %s]", prompt, repo, clonePath),
		Kind: "prompt",
	})

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

	// Parse stream-json from stdout in a goroutine
	type streamResult struct {
		sessionID  string
		resultText string
	}
	streamDone := make(chan streamResult, 1)
	go func() {
		sid, text := r.parseStream(repo, stdoutPipe, f)
		streamDone <- streamResult{sid, text}
	}()

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
		<-done
		rc = -9
	}

	// Wait for stream parser to finish
	sr := <-streamDone
	sessionID := sr.sessionID

	f.Close()
	r.budget.ClearInFlight(repo)

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

	// Notify via Zulip so owner can monitor automation
	r.notifyZulip(repo, prompt, status, rc, reason, sr.resultText)

	// Build verification gate — run after successful Claude completion
	if rc == 0 && r.buildVerify {
		r.verifyBuild(repo, clonePath, prompt)
	}

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

// verifyBuild runs `npm run build` in repos that have a package.json.
// Emits build_ok or build_failed events. Does not block or revert — serves
// as an alert mechanism so humans can investigate broken builds promptly.
func (r *Runner) verifyBuild(repo, clonePath, prompt string) {
	pkgJSON := filepath.Join(clonePath, "package.json")
	if _, err := os.Stat(pkgJSON); os.IsNotExist(err) {
		return // not a Node project, skip
	}

	r.log.Info("build-gate: verifying", "repo", repo)
	r.logs.Append(repo, logbuf.Line{
		Text: "[build-gate] running npm run build...",
		Kind: "system",
	})

	cmd := exec.Command("npm", "run", "build")
	cmd.Dir = clonePath
	cmd.Env = append(os.Environ(), "NODE_ENV=production")

	output, err := cmd.CombinedOutput()
	// Capture last 20 lines for the event detail
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	tail := lines
	if len(tail) > 20 {
		tail = tail[len(tail)-20:]
	}
	snippet := strings.Join(tail, "\n")

	if err != nil {
		r.log.Error("build-gate: FAILED", "repo", repo, "error", err)
		r.logs.Append(repo, logbuf.Line{
			Text: fmt.Sprintf("[build-gate] FAILED: %s", err),
			Kind: "error",
		})
		for _, line := range tail {
			r.logs.Append(repo, logbuf.Line{Text: "  " + line, Kind: "error"})
		}
		r.store.Emit(store.Event{
			Type:   "build_failed",
			Repo:   repo,
			Detail: fmt.Sprintf("after %s: %s\n%s", prompt, err, snippet),
			Prompt: prompt,
		})
		return
	}

	r.log.Info("build-gate: OK", "repo", repo)
	r.logs.Append(repo, logbuf.Line{
		Text: "[build-gate] OK",
		Kind: "system",
	})
	r.store.Emit(store.Event{
		Type:   "build_ok",
		Repo:   repo,
		Detail: fmt.Sprintf("after %s", prompt),
		Prompt: prompt,
	})
}

// parseStream reads stream-json lines from claude stdout, accumulates text deltas
// into coherent lines, tees raw data to the log file, and returns (session_id, result_text).
func (r *Runner) parseStream(repo string, stdout io.Reader, logFile *os.File) (string, string) {
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 256*1024), 1024*1024) // 1MB max line

	var sessionID string
	var resultText string
	var textBuf strings.Builder // accumulates text deltas between flushes
	inToolUse := false

	flushText := func() {
		if textBuf.Len() == 0 {
			return
		}
		// Split accumulated text into lines and emit each
		text := textBuf.String()
		textBuf.Reset()
		for _, line := range strings.Split(text, "\n") {
			if line == "" {
				continue
			}
			r.logs.Append(repo, logbuf.Line{Text: line, Kind: "assistant"})
		}
	}

	for scanner.Scan() {
		raw := scanner.Bytes()

		// Tee to log file
		logFile.Write(raw)
		logFile.Write([]byte("\n"))

		// Parse the stream-json event
		var ev streamEvent
		if err := json.Unmarshal(raw, &ev); err != nil {
			r.logs.Append(repo, logbuf.Line{Text: string(raw), Kind: "raw"})
			continue
		}

		switch ev.Type {
		case "content_block_start":
			if ev.ContentBlock.Type == "tool_use" {
				flushText()
				inToolUse = true
				r.logs.Append(repo, logbuf.Line{
					Text: fmt.Sprintf("[tool: %s]", ev.ContentBlock.Name),
					Kind: "tool_use",
				})
			} else if ev.ContentBlock.Type == "text" {
				inToolUse = false
			}

		case "content_block_delta":
			if ev.Delta.Type == "text_delta" && ev.Delta.Text != "" {
				textBuf.WriteString(ev.Delta.Text)
				// Flush on newlines so we get real-time line output
				if strings.Contains(ev.Delta.Text, "\n") {
					flushText()
				}
			} else if ev.Delta.Type == "input_json_delta" && ev.Delta.PartialJSON != "" && inToolUse {
				// Accumulate tool input for display
				textBuf.WriteString(ev.Delta.PartialJSON)
				if strings.Contains(ev.Delta.PartialJSON, "\n") {
					// Flush tool input lines
					text := textBuf.String()
					textBuf.Reset()
					for _, line := range strings.Split(text, "\n") {
						if line == "" {
							continue
						}
						r.logs.Append(repo, logbuf.Line{Text: "  " + line, Kind: "tool_input"})
					}
				}
			}

		case "content_block_stop":
			flushText()

		case "message_start":
			// Log the model and role
			if ev.Message.Role != "" {
				r.logs.Append(repo, logbuf.Line{
					Text: fmt.Sprintf("[%s message, model: %s]", ev.Message.Role, ev.Message.Model),
					Kind: "system",
				})
			}

		case "message_stop":
			flushText()

		case "result":
			flushText()
			if ev.SessionID != "" {
				sessionID = ev.SessionID
			}
			if ev.Result != "" {
				resultText = ev.Result
			}
			costStr := ""
			cost := ev.CostUSD
			if cost == 0 {
				cost = ev.TotalCostUSD
			}
			if cost > 0 {
				costStr = fmt.Sprintf(", cost: $%.4f", cost)
			}
			r.logs.Append(repo, logbuf.Line{
				Text: fmt.Sprintf("[done: session=%s%s]", ev.SessionID, costStr),
				Kind: "system",
			})
		}
	}

	// Final flush
	flushText()
	return sessionID, resultText
}

// notifyZulip sends a run summary to the Zulip golem stream via zulip-notify.sh.
func (r *Runner) notifyZulip(repo, prompt, status string, exitCode int, reason, resultText string) {
	script := filepath.Join(os.Getenv("HOME"), "Projects/claude-control/scripts/zulip-notify.sh")

	if _, err := os.Stat(script); os.IsNotExist(err) {
		r.log.Warn("zulip-notify.sh not found, skipping notification")
		return
	}

	icon := "✅"
	if exitCode != 0 {
		icon = "❌"
	}

	msg := fmt.Sprintf("%s [%s] %s → %s\nReason: %s", icon, repo, prompt, status, reason)

	if resultText != "" {
		summary := resultText
		if len(summary) > 500 {
			summary = summary[:500] + "…"
		}
		msg += fmt.Sprintf("\n\nOutput:\n%s", summary)
	}

	if len(msg) > 1500 {
		msg = msg[:1500]
	}

	topic := fmt.Sprintf("daemon/%s", repo)
	cmd := exec.Command(script, topic, msg)
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Run(); err != nil {
		r.log.Warn("zulip notification failed", "error", err)
	}
}

// notifySignal sends a run summary to the owner via Signal bridge.
func (r *Runner) notifySignal(repo, prompt, status string, exitCode int, reason, resultText string) {
	bridge := filepath.Join(os.Getenv("HOME"), "Projects/claude-control/signal-bridge/target/release/signal-bridge")
	ownerACI := "9d656f51-0716-445b-8074-dd08931e2174"

	if _, err := os.Stat(bridge); os.IsNotExist(err) {
		r.log.Warn("signal bridge binary not found, skipping notification")
		return
	}

	icon := "✅"
	if exitCode != 0 {
		icon = "❌"
	}

	msg := fmt.Sprintf("%s [%s] %s → %s\nReason: %s", icon, repo, prompt, status, reason)

	// Append result summary if available (truncate to keep message readable)
	if resultText != "" {
		summary := resultText
		if len(summary) > 500 {
			summary = summary[:500] + "…"
		}
		msg += fmt.Sprintf("\n\nOutput:\n%s", summary)
	}

	if len(msg) > 1500 {
		msg = msg[:1500]
	}

	cmd := exec.Command(bridge, "send", "--to", ownerACI, msg)
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Run(); err != nil {
		r.log.Warn("signal notification failed", "error", err)
	}
}

// streamEvent represents a stream-json line from claude.
type streamEvent struct {
	Type         string  `json:"type"`
	SessionID    string  `json:"session_id,omitempty"`
	CostUSD      float64 `json:"cost_usd,omitempty"`
	TotalCostUSD float64 `json:"total_cost_usd,omitempty"`
	Result       string  `json:"result,omitempty"`
	Delta     struct {
		Type        string `json:"type"`
		Text        string `json:"text"`
		PartialJSON string `json:"partial_json"`
	} `json:"delta,omitempty"`
	ContentBlock struct {
		Type string `json:"type"`
		Name string `json:"name"`
	} `json:"content_block,omitempty"`
	Message struct {
		Role  string `json:"role"`
		Model string `json:"model"`
	} `json:"message,omitempty"`
}
