package install

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"text/template"
)

// Config holds install-time settings.
type Config struct {
	BinaryPath   string // path to the interagent binary
	Port         int
	TunnelName   string
	TunnelHost   string
	ConfigDir    string // ~/.config/interagent
	LogDir       string // ~/logs
	WorkDir      string // working directory for the service
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	home, _ := os.UserHomeDir()
	exe, _ := os.Executable()
	return Config{
		BinaryPath: exe,
		Port:       8787,
		TunnelName: "interagent",
		TunnelHost: "interagent.unratified.org",
		ConfigDir:  filepath.Join(home, ".config", "interagent"),
		LogDir:     filepath.Join(home, "logs"),
		WorkDir:    filepath.Join(home, "projects", "unratified"),
	}
}

// Installer handles service installation on macOS and Linux.
type Installer struct {
	cfg Config
	log *slog.Logger
}

// New creates an installer.
func New(cfg Config, log *slog.Logger) *Installer {
	return &Installer{cfg: cfg, log: log}
}

// Run performs the full installation.
func (inst *Installer) Run() error {
	inst.log.Info("installing interagent daemon", "os", runtime.GOOS)

	// Create directories
	for _, dir := range []string{inst.cfg.ConfigDir, inst.cfg.LogDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("create directory %s: %w", dir, err)
		}
		inst.log.Info("directory ready", "path", dir)
	}

	// Generate env file if missing
	envFile := filepath.Join(inst.cfg.ConfigDir, "env")
	if _, err := os.Stat(envFile); os.IsNotExist(err) {
		secret, err := generateSecret()
		if err != nil {
			return fmt.Errorf("generate secret: %w", err)
		}
		content := fmt.Sprintf(
			"WEBHOOK_SECRET=%s\nMAX_SYNCS_PER_HOUR=6\nMAX_SYNCS_PER_DAY=30\nSYNC_TIMEOUT_SECONDS=1200\n",
			secret,
		)
		if err := os.WriteFile(envFile, []byte(content), 0600); err != nil {
			return fmt.Errorf("write env file: %w", err)
		}
		inst.log.Info("generated webhook secret", "file", envFile)
		fmt.Printf("\n  Webhook secret for GitHub: %s\n\n", secret)
	} else {
		inst.log.Info("env file exists", "file", envFile)
	}

	// Check ANTHROPIC_API_KEY
	envContent, _ := os.ReadFile(envFile)
	if !strings.Contains(string(envContent), "ANTHROPIC_API_KEY") {
		fmt.Printf("\n  ANTHROPIC_API_KEY not found in %s\n", envFile)
		fmt.Printf("  Add it: echo 'ANTHROPIC_API_KEY=sk-ant-...' >> %s\n\n", envFile)
	}

	// OS-specific service install
	switch runtime.GOOS {
	case "darwin":
		return inst.installMacOS()
	case "linux":
		return inst.installLinux()
	default:
		inst.log.Warn("unsupported OS for service install", "os", runtime.GOOS)
		fmt.Printf("Run manually: %s serve\n", inst.cfg.BinaryPath)
		return nil
	}
}

func (inst *Installer) installMacOS() error {
	home, _ := os.UserHomeDir()
	launchDir := filepath.Join(home, "Library", "LaunchAgents")
	if err := os.MkdirAll(launchDir, 0755); err != nil {
		return err
	}

	// Create wrapper script that sources env
	wrapperPath := filepath.Join(inst.cfg.ConfigDir, "run.sh")
	wrapperTmpl := `#!/usr/bin/env bash
set -a
source "{{.ConfigDir}}/env"
set +a
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin"
exec "{{.BinaryPath}}" serve --port {{.Port}}
`
	if err := renderTemplate(wrapperPath, wrapperTmpl, inst.cfg); err != nil {
		return fmt.Errorf("write wrapper: %w", err)
	}
	os.Chmod(wrapperPath, 0755)
	inst.log.Info("created wrapper script", "path", wrapperPath)

	// Install launchd plist
	plistPath := filepath.Join(launchDir, "com.unratified.interagent.plist")
	plistTmpl := `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.unratified.interagent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>{{.ConfigDir}}/run.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{{.LogDir}}/interagent-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>{{.LogDir}}/interagent-stderr.log</string>
    <key>WorkingDirectory</key>
    <string>{{.WorkDir}}</string>
</dict>
</plist>
`
	if err := renderTemplate(plistPath, plistTmpl, inst.cfg); err != nil {
		return fmt.Errorf("write plist: %w", err)
	}
	inst.log.Info("installed LaunchAgent", "path", plistPath)

	fmt.Println("\nTo start the service:")
	fmt.Printf("  launchctl load %s\n\n", plistPath)
	fmt.Println("To stop:")
	fmt.Printf("  launchctl unload %s\n", plistPath)

	return nil
}

func (inst *Installer) installLinux() error {
	home, _ := os.UserHomeDir()
	systemdDir := filepath.Join(home, ".config", "systemd", "user")
	if err := os.MkdirAll(systemdDir, 0755); err != nil {
		return err
	}

	unitPath := filepath.Join(systemdDir, "interagent.service")
	unitTmpl := `[Unit]
Description=Interagent Mesh Daemon
After=network.target

[Service]
Type=simple
EnvironmentFile={{.ConfigDir}}/env
ExecStart={{.BinaryPath}} serve --port {{.Port}}
WorkingDirectory={{.WorkDir}}
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
`
	if err := renderTemplate(unitPath, unitTmpl, inst.cfg); err != nil {
		return fmt.Errorf("write systemd unit: %w", err)
	}
	inst.log.Info("installed systemd unit", "path", unitPath)

	// Reload and enable
	exec.Command("systemctl", "--user", "daemon-reload").Run()
	exec.Command("systemctl", "--user", "enable", "interagent.service").Run()

	fmt.Println("\nTo start the service:")
	fmt.Println("  systemctl --user start interagent")
	fmt.Println("\nTo check status:")
	fmt.Println("  systemctl --user status interagent")

	return nil
}

func generateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func renderTemplate(path, tmpl string, data any) error {
	t, err := template.New("").Parse(tmpl)
	if err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return t.Execute(f, data)
}
