package daemon

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

// GPUJob represents a GPU compute job submitted to chromabook.
type GPUJob struct {
	ID        string    `json:"id"`
	Command   string    `json:"command"`
	Status    string    `json:"status"` // "queued", "running", "completed", "failed"
	SubmitAt  time.Time `json:"submit_at"`
	StartAt   time.Time `json:"start_at,omitempty"`
	EndAt     time.Time `json:"end_at,omitempty"`
	Result    string    `json:"result,omitempty"`
	Error     string    `json:"error,omitempty"`
	ExitCode  int       `json:"exit_code,omitempty"`
}

// GPUQueue manages GPU compute jobs on the secondary agent.
type GPUQueue struct {
	sshHost   string
	sshInit   string // nvm init prefix
	jobDir    string // local dir for job metadata
	mu        sync.Mutex
	jobs      map[string]*GPUJob
	queue     chan *GPUJob
	maxActive int
	active    int
}

// NewGPUQueue creates a GPU job queue targeting a peer via SSH.
func NewGPUQueue(sshHost, sshInit, jobDir string) *GPUQueue {
	os.MkdirAll(jobDir, 0755)
	return &GPUQueue{
		sshHost:   sshHost,
		sshInit:   sshInit,
		jobDir:    jobDir,
		jobs:      make(map[string]*GPUJob),
		queue:     make(chan *GPUJob, 100),
		maxActive: 2, // max concurrent GPU jobs
	}
}

// Submit queues a GPU job and returns its ID.
func (q *GPUQueue) Submit(command string) string {
	id := fmt.Sprintf("gpu-%d", time.Now().UnixNano())
	job := &GPUJob{
		ID:       id,
		Command:  command,
		Status:   "queued",
		SubmitAt: time.Now(),
	}

	q.mu.Lock()
	q.jobs[id] = job
	q.mu.Unlock()

	q.queue <- job
	return id
}

// Get returns a job by ID.
func (q *GPUQueue) Get(id string) (*GPUJob, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	j, ok := q.jobs[id]
	if !ok {
		return nil, false
	}
	cp := *j
	return &cp, true
}

// List returns all jobs (most recent first).
func (q *GPUQueue) List(limit int) []*GPUJob {
	q.mu.Lock()
	defer q.mu.Unlock()
	all := make([]*GPUJob, 0, len(q.jobs))
	for _, j := range q.jobs {
		cp := *j
		all = append(all, &cp)
	}
	// Sort by submit time descending
	for i := 0; i < len(all); i++ {
		for j := i + 1; j < len(all); j++ {
			if all[j].SubmitAt.After(all[i].SubmitAt) {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	if limit > 0 && len(all) > limit {
		all = all[:limit]
	}
	return all
}

// Run processes queued jobs. Blocks.
func (q *GPUQueue) Run() {
	for job := range q.queue {
		// Wait if at max concurrency
		q.mu.Lock()
		for q.active >= q.maxActive {
			q.mu.Unlock()
			time.Sleep(time.Second)
			q.mu.Lock()
		}
		q.active++
		q.mu.Unlock()

		go q.execute(job)
	}
}

func (q *GPUQueue) execute(job *GPUJob) {
	defer func() {
		q.mu.Lock()
		q.active--
		q.mu.Unlock()
	}()

	q.mu.Lock()
	job.Status = "running"
	job.StartAt = time.Now()
	q.mu.Unlock()

	// Run via SSH in a tmux session for persistence
	// Redirect stdout+stderr to a file for reliable capture after session ends
	tmuxSession := fmt.Sprintf("gpu-%s", job.ID)
	sshCmd := q.sshInit + fmt.Sprintf(
		`tmux new-session -d -s %s '%s > /tmp/%s.out 2>&1; echo "EXIT_CODE=$?" > /tmp/%s.status' 2>/dev/null && echo STARTED`,
		tmuxSession, job.Command, job.ID, job.ID,
	)

	cmd := exec.Command("ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", q.sshHost, sshCmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		q.mu.Lock()
		job.Status = "failed"
		job.EndAt = time.Now()
		job.Error = fmt.Sprintf("ssh launch failed: %s: %s", err, string(out))
		q.mu.Unlock()
		q.persist(job)
		return
	}

	// Poll for completion
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	timeout := time.After(20 * time.Minute)

	for {
		select {
		case <-ticker.C:
			if q.checkComplete(job, tmuxSession) {
				q.persist(job)
				return
			}
		case <-timeout:
			q.mu.Lock()
			job.Status = "failed"
			job.EndAt = time.Now()
			job.Error = "timeout (20 min)"
			q.mu.Unlock()
			// Kill the tmux session
			exec.Command("ssh", "-o", "BatchMode=yes", q.sshHost,
				q.sshInit+fmt.Sprintf("tmux kill-session -t %s 2>/dev/null", tmuxSession)).Run()
			q.persist(job)
			return
		}
	}
}

func (q *GPUQueue) checkComplete(job *GPUJob, tmuxSession string) bool {
	// Check if tmux session still exists
	cmd := exec.Command("ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", q.sshHost,
		q.sshInit+fmt.Sprintf("tmux has-session -t %s 2>/dev/null && echo RUNNING || cat /tmp/%s.status 2>/dev/null",
			tmuxSession, job.ID))
	out, _ := cmd.Output()
	result := string(out)

	if result == "" || result == "RUNNING\n" {
		return false
	}

	// Session ended, get output from file
	outCmd := exec.Command("ssh", "-o", "BatchMode=yes", q.sshHost,
		q.sshInit+fmt.Sprintf("cat /tmp/%s.out 2>/dev/null", job.ID))
	fullOut, _ := outCmd.Output()

	// Parse exit code from status file
	statusCmd := exec.Command("ssh", "-o", "BatchMode=yes", q.sshHost,
		q.sshInit+fmt.Sprintf("cat /tmp/%s.status 2>/dev/null", job.ID))
	statusOut, _ := statusCmd.Output()
	exitCode := 0
	fmt.Sscanf(string(statusOut), "EXIT_CODE=%d", &exitCode)

	q.mu.Lock()
	if exitCode == 0 {
		job.Status = "completed"
	} else {
		job.Status = "failed"
	}
	job.EndAt = time.Now()
	job.Result = string(fullOut)
	job.ExitCode = exitCode
	q.mu.Unlock()

	// Cleanup remote temp files
	exec.Command("ssh", "-o", "BatchMode=yes", q.sshHost,
		q.sshInit+fmt.Sprintf("rm -f /tmp/%s.status /tmp/%s.out; tmux kill-session -t %s 2>/dev/null",
			job.ID, job.ID, tmuxSession)).Run()

	return true
}

func (q *GPUQueue) persist(job *GPUJob) {
	data, _ := json.MarshalIndent(job, "", "  ")
	os.WriteFile(filepath.Join(q.jobDir, job.ID+".json"), data, 0644)
}
