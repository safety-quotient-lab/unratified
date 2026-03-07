package logbuf

import (
	"sync"
)

// Line represents a single parsed output line from a claude process.
type Line struct {
	Text string `json:"text"`
	Kind string `json:"kind"` // "assistant", "tool_use", "tool_result", "system", "raw"
}

// Ring holds the last N lines of output per repo.
type Ring struct {
	mu    sync.RWMutex
	repos map[string]*repoBuf
	cap   int
}

type repoBuf struct {
	lines []Line
	seq   int64 // monotonic sequence number for polling
}

// New creates a ring buffer manager. cap sets the max lines per repo.
func New(cap int) *Ring {
	return &Ring{
		repos: make(map[string]*repoBuf),
		cap:   cap,
	}
}

// Append adds a line to a repo's buffer.
func (r *Ring) Append(repo string, line Line) {
	r.mu.Lock()
	defer r.mu.Unlock()

	rb, ok := r.repos[repo]
	if !ok {
		rb = &repoBuf{lines: make([]Line, 0, r.cap)}
		r.repos[repo] = rb
	}

	rb.lines = append(rb.lines, line)
	if len(rb.lines) > r.cap {
		// Drop oldest quarter to avoid constant shifting
		drop := r.cap / 4
		copy(rb.lines, rb.lines[drop:])
		rb.lines = rb.lines[:len(rb.lines)-drop]
	}
	rb.seq++
}

// Clear resets a repo's buffer (called when a run finishes).
func (r *Ring) Clear(repo string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.repos, repo)
}

// Lines returns all buffered lines for a repo and the current sequence number.
func (r *Ring) Lines(repo string) ([]Line, int64) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rb, ok := r.repos[repo]
	if !ok {
		return nil, 0
	}
	out := make([]Line, len(rb.lines))
	copy(out, rb.lines)
	return out, rb.seq
}

// Seq returns the current sequence number for a repo (for cheap poll checks).
func (r *Ring) Seq(repo string) int64 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if rb, ok := r.repos[repo]; ok {
		return rb.seq
	}
	return 0
}

// Repos returns repo names that have active buffers.
func (r *Ring) Repos() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]string, 0, len(r.repos))
	for k := range r.repos {
		out = append(out, k)
	}
	return out
}
