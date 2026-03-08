package changelog

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Entry represents a single changelog item.
type Entry struct {
	Timestamp   time.Time `json:"timestamp"`
	Hash        string    `json:"hash"`
	AuthorName  string    `json:"author_name"`
	AuthorEmail string    `json:"author_email"`
	Subject     string    `json:"subject"`
	Body        string    `json:"body,omitempty"`
	Repo        string    `json:"repo"`
	Skill       string    `json:"skill,omitempty"`       // from sidecar
	SessionID   string    `json:"session_id,omitempty"`  // from sidecar
	BudgetUsed  int       `json:"budget_used,omitempty"` // from sidecar
}

// SidecarEntry holds extra metadata written by the daemon after each run.
type SidecarEntry struct {
	Hash      string `json:"hash"`
	Skill     string `json:"skill"`
	SessionID string `json:"session_id"`
	Budget    int    `json:"budget_used"`
	Repo      string `json:"repo"`
	Timestamp string `json:"timestamp"`
}

// GenerateFromGit parses git log for agent-authored commits and merges sidecar metadata.
func GenerateFromGit(repoPath, sidecarPath string, maxEntries int) ([]Entry, error) {
	// Get git log for co-authored commits
	format := "%H%x00%aI%x00%an%x00%ae%x00%s%x00%b%x1e"
	cmd := exec.Command("git", "log",
		"--all",
		fmt.Sprintf("--max-count=%d", maxEntries*2), // overfetch to filter
		fmt.Sprintf("--format=%s", format),
		"--grep=Co-Authored-By",
	)
	cmd.Dir = repoPath
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git log: %w", err)
	}

	// Load sidecar metadata
	sidecar := loadSidecar(sidecarPath)

	// Parse commits
	records := strings.Split(string(out), "\x1e")
	var entries []Entry

	for _, record := range records {
		record = strings.TrimSpace(record)
		if record == "" {
			continue
		}

		fields := strings.SplitN(record, "\x00", 6)
		if len(fields) < 5 {
			continue
		}

		hash := fields[0]
		ts, _ := time.Parse(time.RFC3339, fields[1])
		author := fields[2]
		email := fields[3]
		subject := fields[4]
		body := ""
		if len(fields) > 5 {
			body = strings.TrimSpace(fields[5])
		}

		entry := Entry{
			Timestamp:   ts,
			Hash:        hash,
			AuthorName:  author,
			AuthorEmail: email,
			Subject:     subject,
			Body:        body,
			Repo:        filepath.Base(repoPath),
		}

		// Merge sidecar data if available
		if sc, ok := sidecar[hash]; ok {
			entry.Skill = sc.Skill
			entry.SessionID = sc.SessionID
			entry.BudgetUsed = sc.Budget
		}

		entries = append(entries, entry)
		if len(entries) >= maxEntries {
			break
		}
	}

	return entries, nil
}

// WriteSidecar appends a metadata entry to the sidecar file.
func WriteSidecar(path string, entry SidecarEntry) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(f, "%s\n", data)
	return err
}

// WriteJSON writes the full changelog as a JSON file for the website build.
func WriteJSON(entries []Entry, outPath string) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(outPath, data, 0644)
}

func loadSidecar(path string) map[string]SidecarEntry {
	result := make(map[string]SidecarEntry)
	if path == "" {
		return result
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return result
	}

	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var entry SidecarEntry
		if err := json.Unmarshal([]byte(line), &entry); err == nil && entry.Hash != "" {
			result[entry.Hash] = entry
		}
	}

	return result
}
