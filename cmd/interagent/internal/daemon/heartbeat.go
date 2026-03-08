package daemon

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// PeerConfig defines a peer agent to monitor.
type PeerConfig struct {
	Name    string `json:"name"`
	SSHHost string `json:"ssh_host"`
}

// PeerStatus holds the latest heartbeat result for a peer.
type PeerStatus struct {
	Name      string    `json:"name"`
	Status    string    `json:"status"` // "up", "down", "unknown"
	LastSeen  time.Time `json:"last_seen,omitempty"`
	LatencyMs int64     `json:"latency_ms,omitempty"`
	Error     string    `json:"error,omitempty"`
	Vitals    *Vitals   `json:"vitals,omitempty"`
}

// Vitals holds lightweight system stats from a peer.
type Vitals struct {
	Uptime    string `json:"uptime"`
	LoadAvg   string `json:"load_avg"`
	MemFreeGB string `json:"mem_free_gb"`
	DiskFreeGB string `json:"disk_free_gb"`
	GPUMemFree string `json:"gpu_mem_free,omitempty"`
}

// Heartbeat monitors peer agents via SSH.
type Heartbeat struct {
	peers    []PeerConfig
	interval time.Duration
	timeout  time.Duration
	mu       sync.RWMutex
	status   map[string]*PeerStatus
}

// NewHeartbeat creates a heartbeat monitor.
func NewHeartbeat(peers []PeerConfig, interval, timeout time.Duration) *Heartbeat {
	status := make(map[string]*PeerStatus, len(peers))
	for _, p := range peers {
		status[p.Name] = &PeerStatus{Name: p.Name, Status: "unknown"}
	}
	return &Heartbeat{
		peers:    peers,
		interval: interval,
		timeout:  timeout,
		status:   status,
	}
}

// Status returns a snapshot of all peer statuses.
func (h *Heartbeat) Status() map[string]*PeerStatus {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make(map[string]*PeerStatus, len(h.status))
	for k, v := range h.status {
		cp := *v
		if v.Vitals != nil {
			vcp := *v.Vitals
			cp.Vitals = &vcp
		}
		out[k] = &cp
	}
	return out
}

// Run starts the heartbeat loop. Blocks until done.
func (h *Heartbeat) Run() {
	// Probe immediately on start
	for _, p := range h.peers {
		h.probe(p)
	}

	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	for range ticker.C {
		for _, p := range h.peers {
			h.probe(p)
		}
	}
}

// probe checks a single peer via SSH.
func (h *Heartbeat) probe(p PeerConfig) {
	start := time.Now()

	// Single SSH command that gathers vitals in one round-trip
	script := `echo "HEARTBEAT_OK" && ` +
		`uptime -p 2>/dev/null || uptime | sed 's/.*up /up /' && ` +
		`awk '{print $1, $2, $3}' /proc/loadavg 2>/dev/null && ` +
		`awk '/MemAvailable/ {printf "%.1f\n", $2/1048576}' /proc/meminfo 2>/dev/null && ` +
		`df -BG / 2>/dev/null | awk 'NR==2 {print $4}' && ` +
		`nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null || echo ""`

	cmd := exec.Command("ssh",
		"-o", "BatchMode=yes",
		"-o", fmt.Sprintf("ConnectTimeout=%d", int(h.timeout.Seconds())),
		"-o", "ServerAliveInterval=5",
		p.SSHHost,
		script,
	)

	out, err := cmd.Output()
	latency := time.Since(start).Milliseconds()

	h.mu.Lock()
	defer h.mu.Unlock()

	ps := h.status[p.Name]
	if err != nil {
		ps.Status = "down"
		ps.LatencyMs = latency
		ps.Error = err.Error()
		ps.Vitals = nil
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) == 0 || lines[0] != "HEARTBEAT_OK" {
		ps.Status = "down"
		ps.LatencyMs = latency
		ps.Error = "unexpected response"
		ps.Vitals = nil
		return
	}

	ps.Status = "up"
	ps.LastSeen = time.Now()
	ps.LatencyMs = latency
	ps.Error = ""
	ps.Vitals = parseVitals(lines[1:])
}

func parseVitals(lines []string) *Vitals {
	v := &Vitals{}
	if len(lines) > 0 {
		v.Uptime = strings.TrimSpace(lines[0])
	}
	if len(lines) > 1 {
		v.LoadAvg = strings.TrimSpace(lines[1])
	}
	if len(lines) > 2 {
		v.MemFreeGB = strings.TrimSpace(lines[2]) + "GB"
	}
	if len(lines) > 3 {
		v.DiskFreeGB = strings.TrimSpace(lines[3])
	}
	if len(lines) > 4 && strings.TrimSpace(lines[4]) != "" {
		v.GPUMemFree = strings.TrimSpace(lines[4]) + "MiB"
	}
	return v
}

// MarshalJSON returns the heartbeat status as JSON.
func (h *Heartbeat) MarshalJSON() ([]byte, error) {
	return json.Marshal(h.Status())
}
