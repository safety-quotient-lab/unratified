package tunnel

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Config holds tunnel configuration.
type Config struct {
	Enabled        bool
	TunnelName     string // e.g. "interagent"
	Hostname       string // e.g. "interagent.unratified.org"
	LocalPort      int    // e.g. 8787
	ConfigDir      string // e.g. ~/.cloudflared
	CredentialsDir string
}

// DefaultConfig returns default tunnel settings.
func DefaultConfig() Config {
	home, _ := os.UserHomeDir()
	return Config{
		Enabled:        true,
		TunnelName:     "interagent",
		Hostname:       "interagent.unratified.org",
		LocalPort:      8787,
		ConfigDir:      filepath.Join(home, ".cloudflared"),
		CredentialsDir: filepath.Join(home, ".cloudflared"),
	}
}

// Manager handles cloudflared subprocess lifecycle.
type Manager struct {
	cfg Config
	cmd *exec.Cmd
	log *slog.Logger
}

// New creates a tunnel manager.
func New(cfg Config, log *slog.Logger) *Manager {
	return &Manager{cfg: cfg, log: log}
}

// Start launches cloudflared as a managed subprocess.
// If the tunnel doesn't exist, it attempts to create it.
func (m *Manager) Start() error {
	if !m.cfg.Enabled {
		m.log.Info("tunnel disabled")
		return nil
	}

	if _, err := exec.LookPath("cloudflared"); err != nil {
		return fmt.Errorf("cloudflared not found in PATH: %w", err)
	}

	// Check if tunnel exists
	tunnelID, err := m.findTunnel()
	if err != nil {
		m.log.Warn("could not list tunnels", "error", err)
	}

	if tunnelID == "" {
		m.log.Info("tunnel not found, creating", "name", m.cfg.TunnelName)
		tunnelID, err = m.createTunnel()
		if err != nil {
			return fmt.Errorf("create tunnel: %w", err)
		}
		m.log.Info("tunnel created", "id", tunnelID)

		// Route DNS
		if err := m.routeDNS(tunnelID); err != nil {
			m.log.Warn("DNS route failed (may already exist)", "error", err)
		}
	}

	// Write config file
	configFile := filepath.Join(m.cfg.ConfigDir, "config-interagent.yml")
	if err := m.writeConfig(tunnelID, configFile); err != nil {
		return fmt.Errorf("write tunnel config: %w", err)
	}

	// Start cloudflared
	m.cmd = exec.Command("cloudflared", "tunnel", "--config", configFile, "run", m.cfg.TunnelName)
	m.cmd.Stdout = os.Stdout
	m.cmd.Stderr = os.Stderr

	if err := m.cmd.Start(); err != nil {
		return fmt.Errorf("start cloudflared: %w", err)
	}

	m.log.Info("cloudflared started",
		"pid", m.cmd.Process.Pid,
		"tunnel", m.cfg.TunnelName,
		"hostname", m.cfg.Hostname,
	)

	// Monitor in background
	go func() {
		if err := m.cmd.Wait(); err != nil {
			m.log.Error("cloudflared exited", "error", err)
			// Restart after a brief pause
			time.Sleep(5 * time.Second)
			m.log.Info("restarting cloudflared")
			m.Start()
		}
	}()

	return nil
}

// Stop terminates the cloudflared subprocess.
func (m *Manager) Stop() error {
	if m.cmd != nil && m.cmd.Process != nil {
		m.log.Info("stopping cloudflared", "pid", m.cmd.Process.Pid)
		return m.cmd.Process.Kill()
	}
	return nil
}

// Running returns true if cloudflared appears to be running.
func (m *Manager) Running() bool {
	return m.cmd != nil && m.cmd.Process != nil && m.cmd.ProcessState == nil
}

// PID returns the cloudflared PID, or 0 if not running.
func (m *Manager) PID() int {
	if m.cmd != nil && m.cmd.Process != nil {
		return m.cmd.Process.Pid
	}
	return 0
}

func (m *Manager) findTunnel() (string, error) {
	out, err := exec.Command("cloudflared", "tunnel", "list", "--output", "json").CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("tunnel list: %w: %s", err, out)
	}

	var tunnels []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(out, &tunnels); err != nil {
		return "", fmt.Errorf("parse tunnel list: %w", err)
	}

	for _, t := range tunnels {
		if t.Name == m.cfg.TunnelName {
			return t.ID, nil
		}
	}
	return "", nil
}

func (m *Manager) createTunnel() (string, error) {
	out, err := exec.Command("cloudflared", "tunnel", "create", m.cfg.TunnelName).CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("tunnel create: %w: %s", err, out)
	}

	// Parse tunnel ID from output
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "Created tunnel") {
			// "Created tunnel interagent with id <UUID>"
			parts := strings.Fields(line)
			for i, p := range parts {
				if p == "id" && i+1 < len(parts) {
					return parts[i+1], nil
				}
			}
		}
	}

	// Try finding it again
	id, err := m.findTunnel()
	if err != nil {
		return "", err
	}
	if id != "" {
		return id, nil
	}

	return "", fmt.Errorf("could not determine tunnel ID from output: %s", out)
}

func (m *Manager) routeDNS(tunnelID string) error {
	out, err := exec.Command("cloudflared", "tunnel", "route", "dns", tunnelID, m.cfg.Hostname).CombinedOutput()
	if err != nil {
		return fmt.Errorf("route dns: %w: %s", err, out)
	}
	m.log.Info("DNS routed", "hostname", m.cfg.Hostname, "tunnel", tunnelID)
	return nil
}

func (m *Manager) writeConfig(tunnelID, path string) error {
	credFile := filepath.Join(m.cfg.CredentialsDir, tunnelID+".json")

	config := fmt.Sprintf(`tunnel: %s
credentials-file: %s
ingress:
  - hostname: %s
    service: http://localhost:%d
  - service: http_status:404
`, tunnelID, credFile, m.cfg.Hostname, m.cfg.LocalPort)

	return os.WriteFile(path, []byte(config), 0644)
}
