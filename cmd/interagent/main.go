package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"

	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/budget"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/changelog"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/daemon"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/install"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/logbuf"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/runner"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/store"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/tui"
	"github.com/safety-quotient-lab/unratified/cmd/interagent/internal/tunnel"
)

var version = "dev"

func main() {
	root := &cobra.Command{
		Use:     "interagent",
		Short:   "Interagent mesh daemon for unratified.org",
		Version: version,
	}

	root.AddCommand(
		serveCmd(),
		tuiCmd(),
		statusCmd(),
		triggerCmd(),
		sessionsCmd(),
		resumeCmd(),
		pauseCmd(),
		unpauseCmd(),
		installCmd(),
		changelogCmd(),
	)

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

// --- serve ---

func serveCmd() *cobra.Command {
	var port int
	var noTunnel bool
	var dbPath string

	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the daemon (HTTP server + scheduler + tunnel)",
		RunE: func(cmd *cobra.Command, args []string) error {
			home, _ := os.UserHomeDir()
			logDir := filepath.Join(home, "logs")
			os.MkdirAll(logDir, 0755)

			log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))
			log.Info("=== Interagent Mesh Daemon ===", "version", version)

			if dbPath == "" {
				dbPath = filepath.Join(home, ".config", "interagent", "interagent.db")
			}
			os.MkdirAll(filepath.Dir(dbPath), 0755)

			st, err := store.Open(dbPath)
			if err != nil {
				return fmt.Errorf("open store: %w", err)
			}
			defer st.Close()

			bcfg := budget.DefaultConfig()
			loadEnvInt("MAX_SYNCS_PER_HOUR", &bcfg.MaxSyncsPerHour)
			loadEnvInt("MAX_SYNCS_PER_DAY", &bcfg.MaxSyncsPerDay)
			loadEnvInt("SYNC_TIMEOUT_SECONDS", &bcfg.TimeoutSeconds)
			loadEnvInt("COOLDOWN_SECONDS", &bcfg.CooldownSeconds)

			bc := budget.New(bcfg, st)
			log.Info("budget",
				"hourly", bcfg.MaxSyncsPerHour,
				"daily", bcfg.MaxSyncsPerDay,
				"cooldown", bcfg.CooldownSeconds,
				"timeout", bcfg.TimeoutSeconds,
			)

			repos := defaultRepos()
			for name, path := range repos {
				if _, err := os.Stat(path); err == nil {
					log.Info("repo", "name", name, "path", path)
				} else {
					log.Warn("repo missing", "name", name, "path", path)
				}
			}

			logs := logbuf.New(500)
			rn := runner.New(repos, bc, st, logs, logDir, log)

			schedule := defaultSchedule()
			if envSched := os.Getenv("SCHEDULE"); envSched != "" {
				json.Unmarshal([]byte(envSched), &schedule)
			}

			dcfg := daemon.Config{
				Port:        port,
				Secret:      os.Getenv("WEBHOOK_SECRET"),
				Schedule:    schedule,
				BuildVerify: os.Getenv("BUILD_VERIFY") != "0",
			}

			if dcfg.Secret == "" {
				log.Warn("WEBHOOK_SECRET not set -- signature verification disabled")
			}

			// Start tunnel
			if !noTunnel {
				tcfg := tunnel.DefaultConfig()
				tcfg.LocalPort = port
				tm := tunnel.New(tcfg, log)
				if err := tm.Start(); err != nil {
					log.Warn("tunnel failed to start (continuing without)", "error", err)
				}
			}

			d := daemon.New(dcfg, rn, bc, st, log)
			return d.ListenAndServe()
		},
	}

	cmd.Flags().IntVar(&port, "port", 8787, "Listen port")
	cmd.Flags().BoolVar(&noTunnel, "no-tunnel", false, "Skip cloudflared tunnel")
	cmd.Flags().StringVar(&dbPath, "db", "", "Database path (default ~/.config/interagent/interagent.db)")

	return cmd
}

// --- tui ---

func tuiCmd() *cobra.Command {
	var host string
	var refresh int

	cmd := &cobra.Command{
		Use:   "tui",
		Short: "Launch the interactive dashboard",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg := tui.DefaultConfig()
			if host != "" {
				cfg.Host = host
			} else if h := os.Getenv("INTERAGENT_HOST"); h != "" {
				cfg.Host = h
			}
			cfg.Token = loadToken()
			cfg.RefreshSecs = refresh

			p := tea.NewProgram(tui.NewModel(cfg), tea.WithAltScreen(), tea.WithMouseCellMotion())
			_, err := p.Run()
			return err
		},
	}

	cmd.Flags().StringVar(&host, "host", "", "Daemon URL (default: interagent.unratified.org)")
	cmd.Flags().IntVar(&refresh, "refresh", 5, "Refresh interval in seconds")

	return cmd
}

// --- status ---

func statusCmd() *cobra.Command {
	var host string

	return &cobra.Command{
		Use:   "status",
		Short: "Show one-shot daemon status",
		RunE: func(cmd *cobra.Command, args []string) error {
			if host == "" {
				host = envOr("INTERAGENT_HOST", "https://interagent.unratified.org")
			}

			resp, err := http.Get(host + "/health")
			if err != nil {
				return fmt.Errorf("cannot reach %s: %w", host, err)
			}
			defer resp.Body.Close()

			var health map[string]any
			json.NewDecoder(resp.Body).Decode(&health)

			out, _ := json.MarshalIndent(health, "", "  ")
			fmt.Println(string(out))
			return nil
		},
	}
}

// --- trigger ---

func triggerCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "trigger <repo> [prompt]",
		Short: "Manually trigger a prompt on a repo",
		Args:  cobra.RangeArgs(1, 2),
		RunE: func(cmd *cobra.Command, args []string) error {
			repo := args[0]
			prompt := "/sync"
			if len(args) > 1 {
				prompt = args[1]
			}

			host := envOr("INTERAGENT_HOST", "https://interagent.unratified.org")
			token := loadToken()

			body := fmt.Sprintf(`{"repo":%q,"prompt":%q}`, repo, prompt)
			req, _ := http.NewRequest("POST", host+"/trigger", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return err
			}
			defer resp.Body.Close()

			var result map[string]any
			json.NewDecoder(resp.Body).Decode(&result)
			out, _ := json.MarshalIndent(result, "", "  ")
			fmt.Println(string(out))
			return nil
		},
	}
}

// --- sessions ---

func sessionsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "sessions",
		Short: "List recent resumable sessions",
		RunE: func(cmd *cobra.Command, args []string) error {
			host := envOr("INTERAGENT_HOST", "https://interagent.unratified.org")
			token := loadToken()

			req, _ := http.NewRequest("GET", host+"/sessions", nil)
			if token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return err
			}
			defer resp.Body.Close()

			var sessions []map[string]any
			json.NewDecoder(resp.Body).Decode(&sessions)

			if len(sessions) == 0 {
				fmt.Println("No sessions with resume capability.")
				return nil
			}

			for _, s := range sessions {
				ts, _ := s["ts"].(string)
				if len(ts) > 19 {
					ts = ts[:19]
				}
				repo, _ := s["repo"].(string)
				detail, _ := s["detail"].(string)
				resume, _ := s["resume"].(string)
				exitCode, _ := s["exit_code"].(float64)

				status := "\033[32m" // green
				if exitCode != 0 {
					status = "\033[31m" // red
				}

				fmt.Printf("  %s [%s] %s%s\033[0m\n", ts, repo, status, detail)
				if resume != "" {
					fmt.Printf("    \033[2mresume: %s\033[0m\n", resume)
				}
				fmt.Println()
			}
			return nil
		},
	}
}

// --- resume ---

func resumeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "resume [repo]",
		Short: "Resume the most recent failed session",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			host := envOr("INTERAGENT_HOST", "https://interagent.unratified.org")
			token := loadToken()

			req, _ := http.NewRequest("GET", host+"/sessions", nil)
			if token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return err
			}
			defer resp.Body.Close()

			var sessions []map[string]any
			json.NewDecoder(resp.Body).Decode(&sessions)

			repoFilter := ""
			if len(args) > 0 {
				repoFilter = args[0]
			}

			// Find most recent failed session
			for i := len(sessions) - 1; i >= 0; i-- {
				s := sessions[i]
				exitCode, _ := s["exit_code"].(float64)
				resume, _ := s["resume"].(string)
				repo, _ := s["repo"].(string)

				if exitCode == 0 || resume == "" {
					continue
				}
				if repoFilter != "" && repo != repoFilter {
					continue
				}

				fmt.Printf("Resume command:\n  %s\n", resume)
				return nil
			}

			fmt.Println("No failed sessions to resume.")
			return nil
		},
	}
}

// --- pause / unpause ---

func pauseCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "pause",
		Short: "Activate kill switch (pause all syncs)",
		RunE: func(cmd *cobra.Command, args []string) error {
			return doAction("/pause")
		},
	}
}

func unpauseCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "unpause",
		Short: "Deactivate kill switch (resume syncs)",
		RunE: func(cmd *cobra.Command, args []string) error {
			return doAction("/resume")
		},
	}
}

// --- install ---

func installCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "install",
		Short: "Install as a system service (launchd on macOS, systemd on Linux)",
		RunE: func(cmd *cobra.Command, args []string) error {
			log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))
			cfg := install.DefaultConfig()
			inst := install.New(cfg, log)
			return inst.Run()
		},
	}
}

// --- changelog ---

func changelogCmd() *cobra.Command {
	var output string
	var maxEntries int

	cmd := &cobra.Command{
		Use:   "changelog [repo-path]",
		Short: "Generate changelog JSON from git history + sidecar metadata",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			repoPath := "."
			if len(args) > 0 {
				repoPath = args[0]
			}

			home, _ := os.UserHomeDir()
			sidecarPath := filepath.Join(home, ".config", "interagent", "changelog-sidecar.jsonl")

			entries, err := changelog.GenerateFromGit(repoPath, sidecarPath, maxEntries)
			if err != nil {
				return err
			}

			if output != "" {
				if err := changelog.WriteJSON(entries, output); err != nil {
					return err
				}
				fmt.Printf("Wrote %d entries to %s\n", len(entries), output)
			} else {
				data, _ := json.MarshalIndent(entries, "", "  ")
				fmt.Println(string(data))
			}
			return nil
		},
	}

	cmd.Flags().StringVarP(&output, "output", "o", "", "Output JSON file path")
	cmd.Flags().IntVar(&maxEntries, "max", 100, "Maximum entries")

	return cmd
}

// --- helpers ---

func defaultRepos() runner.RepoConfig {
	home, _ := os.UserHomeDir()
	return runner.RepoConfig{
		"unratified":       filepath.Join(home, "projects", "unratified"),
		"psychology-agent": filepath.Join(home, "projects", "psychology-sqlab"),
		"observatory":      filepath.Join(home, "projects", "observatory-sqlab"),
	}
}

func defaultSchedule() []daemon.ScheduleTask {
	return []daemon.ScheduleTask{
		{Repo: "unratified", Prompt: "/sync", Interval: 300},
		{Repo: "unratified", Prompt: "/iterate quick", Interval: 1800},
		{Repo: "psychology-agent", Prompt: "/scan-peer unratified", Interval: 86400}, // daily content scan
	}
}

func loadToken() string {
	if t := os.Getenv("INTERAGENT_TOKEN"); t != "" {
		return t
	}
	home, _ := os.UserHomeDir()
	envFile := filepath.Join(home, ".config", "interagent", "env")
	f, err := os.Open(envFile)
	if err != nil {
		return ""
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "WEBHOOK_SECRET=") {
			return strings.TrimPrefix(line, "WEBHOOK_SECRET=")
		}
	}
	return ""
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func loadEnvInt(key string, target *int) {
	if v := os.Getenv(key); v != "" {
		fmt.Sscanf(v, "%d", target)
	}
}

func doAction(path string) error {
	host := envOr("INTERAGENT_HOST", "https://interagent.unratified.org")
	token := loadToken()

	req, _ := http.NewRequest("GET", host+path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var buf [256]byte
	n, _ := resp.Body.Read(buf[:])
	fmt.Print(string(buf[:n]))
	return nil
}
