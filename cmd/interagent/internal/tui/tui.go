package tui

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// Tab identifies which view panel to show.
type Tab int

const (
	TabLoop Tab = iota
	TabFeed
	TabSessions
)

var tabNames = []string{"Loop", "Feed", "Sessions"}

// LoopPhase represents the current phase of the iterate cycle.
type LoopPhase int

const (
	PhaseIdle LoopPhase = iota
	PhaseSync
	PhaseIterate
)

var phaseNames = map[LoopPhase]string{
	PhaseIdle:    "IDLE",
	PhaseSync:    "SYNC",
	PhaseIterate: "ITERATE",
}

// Config holds TUI settings.
type Config struct {
	Host        string
	Token       string
	RefreshSecs int
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	return Config{
		Host:        "https://interagent.unratified.org",
		RefreshSecs: 5,
	}
}

// healthData mirrors the /health JSON response.
type healthData struct {
	Status  string         `json:"status"`
	Paused  bool           `json:"paused"`
	InFlight map[string]int `json:"in_flight"`
	Queued   map[string]string `json:"queued"`
	Budget   struct {
		DailyUsed  int            `json:"daily_used"`
		DailyMax   int            `json:"daily_max"`
		HourlyMax  int            `json:"hourly_max"`
		HourlyUsed map[string]int `json:"hourly_used"`
	} `json:"budget"`
	TimeoutSeconds  int `json:"timeout_seconds"`
	CooldownSeconds int `json:"cooldown_seconds"`
	Cooldowns       map[string]int `json:"cooldowns"`
	Schedule        []struct {
		Repo     string `json:"repo"`
		Prompt   string `json:"prompt"`
		Interval int    `json:"interval"`
		NextRun  string `json:"next_run"`
	} `json:"schedule"`
	BuildVerify bool     `json:"build_verify"`
	Repos       []string `json:"repos"`
	Timestamp   string   `json:"timestamp"`
}

// activityEvent mirrors the activity JSON.
type activityEvent struct {
	TS        string `json:"ts"`
	Event     string `json:"event"`
	Repo      string `json:"repo"`
	Detail    string `json:"detail"`
	Prompt    string `json:"prompt"`
	SessionID string `json:"session_id"`
	Resume    string `json:"resume"`
	ExitCode  *int   `json:"exit_code"`
}

// Messages for tea.Cmd
type tickMsg time.Time
type healthMsg struct {
	data *healthData
	err  error
}
type activityMsg struct {
	events []activityEvent
	err    error
}
type sessionsMsg struct {
	events []activityEvent
	err    error
}
type actionMsg struct {
	result string
	err    error
}

// logLine mirrors logbuf.Line
type logLine struct {
	Text string `json:"text"`
	Kind string `json:"kind"`
}
type logsMsg struct {
	repo  string
	lines []logLine
	seq   int64
	err   error
}

// Model holds TUI state.
type Model struct {
	cfg        Config
	tab        Tab
	health     *healthData
	logLines   []logLine
	logSeq     int64
	activity   []activityEvent
	sessions   []activityEvent
	spinner    spinner.Model
	width      int
	height     int
	scroll     int
	autoScroll bool
	err        error
	lastAction string
	quitting   bool
}

// keybindings
type keyMap struct {
	Quit       key.Binding
	Tab1       key.Binding
	Tab2       key.Binding
	Tab3       key.Binding
	NextTab    key.Binding
	PrevTab    key.Binding
	Pause      key.Binding
	Resume     key.Binding
	TrigSync   key.Binding
	TrigIter   key.Binding
	Up         key.Binding
	Down       key.Binding
	PgUp       key.Binding
	PgDown     key.Binding
	Home       key.Binding
	End        key.Binding
}

var keys = keyMap{
	Quit:     key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
	Tab1:     key.NewBinding(key.WithKeys("1"), key.WithHelp("1", "loop")),
	Tab2:     key.NewBinding(key.WithKeys("2"), key.WithHelp("2", "feed")),
	Tab3:     key.NewBinding(key.WithKeys("3"), key.WithHelp("3", "sessions")),
	NextTab:  key.NewBinding(key.WithKeys("tab", "right", "l"), key.WithHelp("tab/right", "next tab")),
	PrevTab:  key.NewBinding(key.WithKeys("shift+tab", "left", "h"), key.WithHelp("shift+tab/left", "prev tab")),
	Pause:    key.NewBinding(key.WithKeys("p"), key.WithHelp("p", "pause")),
	Resume:   key.NewBinding(key.WithKeys("r"), key.WithHelp("r", "resume")),
	TrigSync: key.NewBinding(key.WithKeys("s"), key.WithHelp("s", "trigger sync")),
	TrigIter: key.NewBinding(key.WithKeys("i"), key.WithHelp("i", "trigger iterate")),
	Up:       key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("up/k", "scroll up")),
	Down:     key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("down/j", "scroll down")),
	PgUp:     key.NewBinding(key.WithKeys("pgup", "ctrl+u"), key.WithHelp("pgup", "page up")),
	PgDown:   key.NewBinding(key.WithKeys("pgdown", "ctrl+d"), key.WithHelp("pgdn", "page down")),
	Home:     key.NewBinding(key.WithKeys("home", "g"), key.WithHelp("home/g", "top")),
	End:      key.NewBinding(key.WithKeys("end", "G"), key.WithHelp("end/G", "bottom")),
}

// Styles
var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("15")).
			Background(lipgloss.Color("63")).
			Padding(0, 1)

	tabActiveStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("15")).
			Background(lipgloss.Color("63")).
			Padding(0, 1)

	tabInactiveStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("250")).
				Padding(0, 1)

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("15"))

	dimStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("242"))

	greenStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("42"))

	redStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("196"))

	yellowStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("220"))

	cyanStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("87"))

	magentaStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("213"))

	footerStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("242")).
			Background(lipgloss.Color("235"))

	barFilledStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("42"))

	barEmptyStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("240"))

	// Loop-specific styles
	phaseBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("63")).
			Padding(0, 2)

	phaseActiveStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(lipgloss.Color("15")).
				Background(lipgloss.Color("63")).
				Padding(0, 1)

	phaseDimStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("240")).
			Padding(0, 1)

	phaseNextStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("250")).
			Padding(0, 1)
)

// eventStyles maps event types to their display style.
var eventStyles = map[string]lipgloss.Style{
	"webhook":     cyanStyle,
	"scheduled":   cyanStyle,
	"run_start":   greenStyle,
	"run_done":    greenStyle,
	"queued":      magentaStyle,
	"queue_drain": magentaStyle,
	"blocked":     yellowStyle,
	"skipped":     dimStyle,
	"timeout":     redStyle,
	"error":       redStyle,
}

var eventSymbols = map[string]string{
	"webhook":     ">>",
	"scheduled":   "~~",
	"run_start":   "->",
	"run_done":    "OK",
	"queued":      "..",
	"queue_drain": "..",
	"blocked":     "XX",
	"skipped":     "--",
	"timeout":     "!!",
	"error":       "!!",
}

// NewModel creates the initial TUI model.
func NewModel(cfg Config) Model {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = cyanStyle
	return Model{
		cfg:        cfg,
		tab:        TabLoop,
		spinner:    s,
		autoScroll: true,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		m.spinner.Tick,
		m.fetchHealth,
		m.fetchActivity,
		tickCmd(m.cfg.RefreshSecs),
	)
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch {
		case key.Matches(msg, keys.Quit):
			m.quitting = true
			return m, tea.Quit
		case key.Matches(msg, keys.Tab1):
			m.tab = TabLoop
			m.scroll = 0
		case key.Matches(msg, keys.Tab2):
			m.tab = TabFeed
			m.scroll = 0
		case key.Matches(msg, keys.Tab3):
			m.tab = TabSessions
			m.scroll = 0
			return m, m.fetchSessions
		case key.Matches(msg, keys.NextTab):
			m.tab = (m.tab + 1) % 3
			m.scroll = 0
			if m.tab == TabSessions {
				return m, m.fetchSessions
			}
		case key.Matches(msg, keys.PrevTab):
			m.tab = (m.tab + 2) % 3
			m.scroll = 0
			if m.tab == TabSessions {
				return m, m.fetchSessions
			}
		case key.Matches(msg, keys.Pause):
			return m, m.doPause
		case key.Matches(msg, keys.Resume):
			return m, m.doResume
		case key.Matches(msg, keys.TrigSync):
			return m, m.doTrigger("unratified", "/sync")
		case key.Matches(msg, keys.TrigIter):
			return m, m.doTrigger("unratified", "/iterate quick")
		case key.Matches(msg, keys.Up):
			m.autoScroll = false
			if m.scroll > 0 {
				m.scroll--
			}
		case key.Matches(msg, keys.Down):
			m.scroll++
			m.clampScroll()
			if m.scroll >= m.maxScroll() {
				m.autoScroll = true
			}
		case key.Matches(msg, keys.PgUp):
			m.autoScroll = false
			m.scroll -= m.pageSize()
			if m.scroll < 0 {
				m.scroll = 0
			}
		case key.Matches(msg, keys.PgDown):
			m.scroll += m.pageSize()
			m.clampScroll()
			if m.scroll >= m.maxScroll() {
				m.autoScroll = true
			}
		case key.Matches(msg, keys.Home):
			m.autoScroll = false
			m.scroll = 0
		case key.Matches(msg, keys.End):
			m.autoScroll = true
			m.scroll = m.maxScroll()
		}

	case tea.MouseMsg:
		switch msg.Button {
		case tea.MouseButtonWheelUp:
			m.autoScroll = false
			if m.scroll > 0 {
				m.scroll -= 3
				if m.scroll < 0 {
					m.scroll = 0
				}
			}
		case tea.MouseButtonWheelDown:
			m.scroll += 3
			m.clampScroll()
			if m.scroll >= m.maxScroll() {
				m.autoScroll = true
			}
		case tea.MouseButtonLeft:
			if msg.Y == 1 {
				m.handleTabClick(msg.X)
				if m.tab == TabSessions {
					return m, m.fetchSessions
				}
			}
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

	case tickMsg:
		return m, tea.Batch(
			m.fetchHealth,
			m.fetchActivity,
			m.fetchLogs,
			tickCmd(m.cfg.RefreshSecs),
		)

	case healthMsg:
		m.health = msg.data
		m.err = msg.err

	case activityMsg:
		if msg.err == nil {
			m.activity = msg.events
			if m.autoScroll {
				m.scroll = m.maxScroll()
			}
		}

	case logsMsg:
		if msg.err == nil && msg.seq != m.logSeq {
			m.logLines = msg.lines
			m.logSeq = msg.seq
		}

	case sessionsMsg:
		if msg.err == nil {
			m.sessions = msg.events
		}

	case actionMsg:
		if msg.err != nil {
			m.lastAction = fmt.Sprintf("Error: %v", msg.err)
		} else {
			m.lastAction = msg.result
		}

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	}

	return m, nil
}

// handleTabClick determines which tab was clicked based on x position.
func (m *Model) handleTabClick(x int) {
	col := 0
	for i, name := range tabNames {
		label := fmt.Sprintf(" %d:%s ", i+1, name)
		tabWidth := len(label)
		if x >= col && x < col+tabWidth {
			m.tab = Tab(i)
			m.scroll = 0
			return
		}
		col += tabWidth
	}
}

// pageSize returns how many lines fit in the scrollable area.
func (m Model) pageSize() int {
	ps := m.height - 10
	if ps < 5 {
		ps = 5
	}
	return ps
}

// maxScroll returns the maximum valid scroll offset for the current tab.
func (m Model) maxScroll() int {
	var total int
	switch m.tab {
	case TabFeed:
		total = len(m.activity)
	case TabSessions:
		total = len(m.sessions)
	default:
		return 0
	}
	ms := total - m.pageSize()
	if ms < 0 {
		return 0
	}
	return ms
}

// clampScroll ensures scroll stays within bounds.
func (m *Model) clampScroll() {
	ms := m.maxScroll()
	if m.scroll > ms {
		m.scroll = ms
	}
}

// currentPhase derives the loop phase from health + activity data.
func (m Model) currentPhase() (LoopPhase, string, string) {
	if m.health == nil {
		return PhaseIdle, "", ""
	}

	// Check in-flight processes
	for repo := range m.health.InFlight {
		// Find what prompt triggered this
		prompt := findInFlightPrompt(m.activity, repo)
		if strings.HasPrefix(prompt, "/sync") {
			return PhaseSync, repo, prompt
		}
		if strings.HasPrefix(prompt, "/iterate") {
			return PhaseIterate, repo, prompt
		}
		if strings.HasPrefix(prompt, "/hunt") {
			return PhaseIterate, repo, prompt
		}
		if strings.HasPrefix(prompt, "/cycle") {
			return PhaseSync, repo, prompt
		}
		// Unknown prompt still in-flight
		if prompt != "" {
			return PhaseIterate, repo, prompt
		}
		return PhaseIdle, repo, ""
	}

	return PhaseIdle, "", ""
}

// findInFlightPrompt scans recent activity for the last run_start without a run_done for this repo.
func findInFlightPrompt(events []activityEvent, repo string) string {
	// Walk backward to find most recent run_start for this repo
	for i := len(events) - 1; i >= 0; i-- {
		ev := events[i]
		if ev.Repo != repo {
			continue
		}
		if ev.Event == "run_done" {
			return "" // Already finished
		}
		if ev.Event == "run_start" {
			return ev.Prompt
		}
	}
	return ""
}

func (m Model) View() string {
	if m.quitting {
		return ""
	}

	var b strings.Builder
	w := m.width
	if w == 0 {
		w = 80
	}

	// Title bar
	title := titleStyle.Render(" INTERAGENT MESH ")
	b.WriteString(title)
	b.WriteString(strings.Repeat(" ", max(0, w-lipgloss.Width(title))))
	b.WriteString("\n")

	// Tab bar
	for i, name := range tabNames {
		if Tab(i) == m.tab {
			b.WriteString(tabActiveStyle.Render(fmt.Sprintf(" %d:%s ", i+1, name)))
		} else {
			b.WriteString(tabInactiveStyle.Render(fmt.Sprintf(" %d:%s ", i+1, name)))
		}
	}
	b.WriteString("\n\n")

	// Stats bar
	b.WriteString(m.renderStatsBar())
	b.WriteString("\n")

	if m.err != nil && m.health == nil {
		b.WriteString(redStyle.Render(fmt.Sprintf("  Cannot reach %s", m.cfg.Host)))
		b.WriteString("\n")
		b.WriteString(dimStyle.Render(fmt.Sprintf("  %v", m.err)))
		b.WriteString("\n")
	} else {
		switch m.tab {
		case TabLoop:
			b.WriteString(m.viewLoop())
		case TabFeed:
			b.WriteString(m.viewFeed())
		case TabSessions:
			b.WriteString(m.viewSessions())
		}
	}

	// Footer
	b.WriteString("\n")
	footer := fmt.Sprintf(" %s | q:quit tab:nav p:pause r:resume s:sync i:iterate | refresh %ds ",
		m.cfg.Host, m.cfg.RefreshSecs)
	if m.lastAction != "" {
		footer += "| " + m.lastAction + " "
	}
	b.WriteString(footerStyle.Render(padRight(footer, w)))

	return b.String()
}

func (m Model) renderStatsBar() string {
	if m.health == nil {
		return dimStyle.Render(fmt.Sprintf("  %s connecting...", m.spinner.View()))
	}

	h := m.health
	var parts []string

	// Status
	if h.Paused {
		parts = append(parts, redStyle.Bold(true).Render("PAUSED"))
	} else {
		phase, repo, _ := m.currentPhase()
		switch phase {
		case PhaseIdle:
			parts = append(parts, greenStyle.Render("IDLE"))
		case PhaseSync:
			parts = append(parts, cyanStyle.Bold(true).Render("SYNC "+repo))
		case PhaseIterate:
			parts = append(parts, magentaStyle.Bold(true).Render("ITER "+repo))
		}
	}

	// Budget bar
	parts = append(parts, renderBar(12, h.Budget.DailyUsed, h.Budget.DailyMax))

	// Countdown timers
	syncCD, iterCD := m.loopCountdowns()
	parts = append(parts, cyanStyle.Render("sync:"+syncCD))
	parts = append(parts, magentaStyle.Render("iter:"+iterCD))

	// Queued
	for repo, prompt := range h.Queued {
		parts = append(parts, yellowStyle.Render(".."+repo+":"+prompt))
	}

	// Scroll indicator
	if m.tab == TabFeed {
		if m.autoScroll {
			parts = append(parts, dimStyle.Render("auto"))
		} else {
			parts = append(parts, yellowStyle.Render("scroll"))
		}
	}

	return "  " + strings.Join(parts, dimStyle.Render("  |  "))
}

// loopCountdowns returns countdown strings for sync and iterate schedule entries.
func (m Model) loopCountdowns() (string, string) {
	syncCD := "---"
	iterCD := "---"
	if m.health == nil {
		return syncCD, iterCD
	}
	for _, task := range m.health.Schedule {
		cd := formatCountdown(task.NextRun)
		if strings.HasPrefix(task.Prompt, "/sync") {
			syncCD = cd
		}
		if strings.HasPrefix(task.Prompt, "/iterate") {
			iterCD = cd
		}
	}
	return syncCD, iterCD
}

// viewLoop renders the main Loop tab — the iterate cycle visualizer.
func (m Model) viewLoop() string {
	if m.health == nil {
		return fmt.Sprintf("  %s Loading...\n", m.spinner.View())
	}

	h := m.health
	var b strings.Builder

	// Phase pipeline
	b.WriteString(m.renderPhasePipeline())
	b.WriteString("\n")

	// Current run details
	phase, repo, prompt := m.currentPhase()
	if phase != PhaseIdle {
		pid := h.InFlight[repo]
		b.WriteString("  ")
		b.WriteString(headerStyle.Render("RUNNING"))
		b.WriteString("  ")
		b.WriteString(greenStyle.Bold(true).Render(repo))
		b.WriteString(dimStyle.Render(fmt.Sprintf("  %s  PID %d", prompt, pid)))
		b.WriteString("\n")

		if secs, ok := h.Cooldowns[repo]; ok && secs > 0 {
			b.WriteString(yellowStyle.Render(fmt.Sprintf("    cooldown: %ds", secs)))
			b.WriteString("\n")
		}

		// Live output from running process
		b.WriteString("\n")
		b.WriteString(m.renderLiveOutput())
	} else if h.Paused {
		b.WriteString("  ")
		b.WriteString(redStyle.Bold(true).Render("PAUSED"))
		b.WriteString(dimStyle.Render("  all syncs halted  (r to resume)"))
		b.WriteString("\n\n")
		b.WriteString(m.renderScheduleSection())
		b.WriteString("\n")
		b.WriteString(m.renderRecentIterations())
	} else {
		b.WriteString("  ")
		b.WriteString(dimStyle.Render("idle  waiting for next scheduled run"))
		b.WriteString("\n\n")
		b.WriteString(m.renderScheduleSection())
		b.WriteString("\n")
		b.WriteString(m.renderRecentIterations())
	}

	return b.String()
}

// renderLiveOutput shows the tail of the live log buffer from the running process.
func (m Model) renderLiveOutput() string {
	var b strings.Builder
	b.WriteString("  ")
	b.WriteString(headerStyle.Render("LIVE OUTPUT"))
	b.WriteString(dimStyle.Render(fmt.Sprintf("  (%d lines)", len(m.logLines))))
	b.WriteString("\n")

	if len(m.logLines) == 0 {
		b.WriteString(dimStyle.Render("    (waiting for output...)"))
		b.WriteString("\n")
		return b.String()
	}

	// Show the last N lines that fit in the available space
	availLines := m.height - 14 // account for header, pipeline, run info, footer
	if availLines < 5 {
		availLines = 5
	}

	start := len(m.logLines) - availLines
	if start < 0 {
		start = 0
	}

	maxW := m.width - 6
	if maxW < 40 {
		maxW = 40
	}

	for _, line := range m.logLines[start:] {
		text := line.Text
		// Trim trailing newlines from text deltas
		text = strings.TrimRight(text, "\n")
		if text == "" {
			continue
		}

		var style lipgloss.Style
		switch line.Kind {
		case "prompt":
			style = greenStyle.Bold(true)
		case "assistant":
			style = lipgloss.NewStyle().Foreground(lipgloss.Color("15"))
		case "tool_use":
			style = cyanStyle.Bold(true)
		case "tool_input":
			style = dimStyle
		case "tool_result":
			style = dimStyle
		case "system":
			style = yellowStyle
		default:
			style = dimStyle
		}

		// Word-wrap long lines
		lines := wrapText(text, maxW)
		for _, wl := range lines {
			b.WriteString("    ")
			b.WriteString(style.Render(wl))
			b.WriteString("\n")
		}
	}

	return b.String()
}

// wrapText breaks text into lines of at most maxW characters.
func wrapText(text string, maxW int) []string {
	if maxW <= 0 {
		return []string{text}
	}
	var result []string
	for _, rawLine := range strings.Split(text, "\n") {
		for len(rawLine) > maxW {
			cut := maxW
			for cut > maxW/2 {
				if rawLine[cut] == ' ' {
					break
				}
				cut--
			}
			if cut <= maxW/2 {
				cut = maxW
			}
			result = append(result, rawLine[:cut])
			rawLine = rawLine[cut:]
			if len(rawLine) > 0 && rawLine[0] == ' ' {
				rawLine = rawLine[1:]
			}
		}
		result = append(result, rawLine)
	}
	return result
}

// renderPhasePipeline draws the loop phase indicator:
//   IDLE  ──>  SYNC  ──>  ITERATE  ──>  (cycle)
func (m Model) renderPhasePipeline() string {
	phase, _, _ := m.currentPhase()

	phases := []struct {
		phase LoopPhase
		label string
	}{
		{PhaseIdle, "IDLE"},
		{PhaseSync, "SYNC"},
		{PhaseIterate, "ITERATE"},
	}

	var parts []string
	for _, p := range phases {
		if p.phase == phase {
			parts = append(parts, phaseActiveStyle.Render(p.label))
		} else if p.phase < phase {
			// Already passed
			parts = append(parts, dimStyle.Render(p.label))
		} else {
			parts = append(parts, phaseDimStyle.Render(p.label))
		}
	}

	arrow := dimStyle.Render(" --> ")
	pipeline := strings.Join(parts, arrow)

	return "  " + pipeline + "\n"
}

// renderScheduleSection shows all scheduled tasks with countdown timers.
func (m Model) renderScheduleSection() string {
	h := m.health
	if len(h.Schedule) == 0 {
		return ""
	}

	var b strings.Builder
	b.WriteString("  ")
	b.WriteString(headerStyle.Render("SCHEDULE"))
	b.WriteString("\n")

	for _, task := range h.Schedule {
		cd := formatCountdown(task.NextRun)
		freq := formatInterval(task.Interval)

		// Determine style based on prompt type
		promptStyle := dimStyle
		timerStyle := dimStyle
		prefix := "  "
		if strings.HasPrefix(task.Prompt, "/sync") {
			promptStyle = cyanStyle
			prefix = cyanStyle.Render("  ~~ ")
		} else if strings.HasPrefix(task.Prompt, "/iterate") {
			promptStyle = magentaStyle
			prefix = magentaStyle.Render("  ~~ ")
		} else {
			prefix = dimStyle.Render("  ~~ ")
		}

		if cd == "now" {
			timerStyle = greenStyle.Bold(true)
		} else {
			timerStyle = promptStyle
		}

		b.WriteString(prefix)
		b.WriteString(promptStyle.Render(fmt.Sprintf("%-16s", task.Prompt)))
		b.WriteString(dimStyle.Render(fmt.Sprintf("  %-12s  ", task.Repo)))
		b.WriteString(timerStyle.Render(cd))
		b.WriteString(dimStyle.Render(fmt.Sprintf("  (%s)", freq)))
		b.WriteString("\n")
	}

	return b.String()
}

// renderRecentIterations shows the last few completed iteration results.
func (m Model) renderRecentIterations() string {
	var b strings.Builder
	b.WriteString("  ")
	b.WriteString(headerStyle.Render("RECENT RUNS"))
	b.WriteString("\n")

	// Collect recent run_done events (walk backward, cap at 8)
	var runs []activityEvent
	for i := len(m.activity) - 1; i >= 0 && len(runs) < 8; i-- {
		ev := m.activity[i]
		if ev.Event == "run_done" {
			runs = append(runs, ev)
		}
	}

	if len(runs) == 0 {
		b.WriteString(dimStyle.Render("    (no completed runs yet)"))
		b.WriteString("\n")
		return b.String()
	}

	// Display newest-first
	for _, ev := range runs {
		ts := ev.TS
		if len(ts) > 19 {
			ts = ts[11:19]
		}

		statusStyle := greenStyle
		statusSym := "OK"
		if ev.ExitCode != nil && *ev.ExitCode != 0 {
			statusStyle = redStyle
			statusSym = fmt.Sprintf("X%d", *ev.ExitCode)
		}

		prompt := ev.Prompt
		if prompt == "" {
			prompt = "?"
		}

		// Categorize the prompt
		promptStyle := dimStyle
		if strings.HasPrefix(prompt, "/sync") {
			promptStyle = cyanStyle
		} else if strings.HasPrefix(prompt, "/iterate") {
			promptStyle = magentaStyle
		}

		repoShort := ev.Repo
		if len(repoShort) > 12 {
			repoShort = repoShort[:12]
		}

		detail := ev.Detail
		maxW := m.width - 50
		if maxW < 20 {
			maxW = 20
		}
		if len(detail) > maxW {
			detail = detail[:maxW-3] + "..."
		}

		b.WriteString(fmt.Sprintf("    %s  %s  %-12s  %s  %s\n",
			dimStyle.Render(ts),
			statusStyle.Render(fmt.Sprintf("%-3s", statusSym)),
			promptStyle.Render(prompt),
			headerStyle.Render(repoShort),
			dimStyle.Render(detail),
		))

		if ev.Resume != "" {
			b.WriteString(dimStyle.Render(fmt.Sprintf("      resume: %s", ev.Resume)))
			b.WriteString("\n")
		}
	}

	return b.String()
}

func (m Model) viewFeed() string {
	if len(m.activity) == 0 {
		return dimStyle.Render("  (no events)\n")
	}

	var b strings.Builder
	b.WriteString(headerStyle.Render("  ACTIVITY FEED"))
	b.WriteString(dimStyle.Render(fmt.Sprintf("  (%d events)", len(m.activity))))
	b.WriteString("\n\n")

	maxVisible := m.pageSize()

	start := m.scroll
	if start > len(m.activity) {
		start = len(m.activity)
	}
	end := start + maxVisible
	if end > len(m.activity) {
		end = len(m.activity)
	}

	for _, ev := range m.activity[start:end] {
		b.WriteString(m.renderEvent(ev))
	}

	if end < len(m.activity) {
		b.WriteString(dimStyle.Render(fmt.Sprintf("\n  ... %d more (scroll: arrows/mouse/pgup/pgdn)", len(m.activity)-end)))
		b.WriteString("\n")
	}

	return b.String()
}

func (m Model) viewSessions() string {
	if len(m.sessions) == 0 {
		return dimStyle.Render("  (no sessions with resume capability)\n")
	}

	var b strings.Builder
	b.WriteString(headerStyle.Render("  SESSIONS"))
	b.WriteString("\n\n")

	for _, s := range m.sessions {
		ts := s.TS
		if len(ts) > 19 {
			ts = ts[11:19]
		}

		style := greenStyle
		if s.ExitCode != nil && *s.ExitCode != 0 {
			style = redStyle
		}

		b.WriteString(dimStyle.Render(fmt.Sprintf("  %s ", ts)))
		b.WriteString(headerStyle.Render(fmt.Sprintf("[%s] ", s.Repo)))
		b.WriteString(style.Render(s.Detail))
		b.WriteString("\n")

		if s.Resume != "" {
			b.WriteString(dimStyle.Render(fmt.Sprintf("    resume: %s", s.Resume)))
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	return b.String()
}

func (m Model) renderEvent(ev activityEvent) string {
	ts := ev.TS
	if len(ts) > 19 {
		ts = ts[11:19]
	}

	sym := eventSymbols[ev.Event]
	if sym == "" {
		sym = "  "
	}

	style, ok := eventStyles[ev.Event]
	if !ok {
		style = dimStyle
	}

	repoShort := ev.Repo
	if len(repoShort) > 12 {
		repoShort = repoShort[:12]
	}

	detail := ev.Detail
	if ev.Prompt != "" && ev.Prompt != "/sync" {
		detail = fmt.Sprintf("[%s] %s", ev.Prompt, detail)
	}

	maxDetail := m.width - 28
	if maxDetail < 300 {
		maxDetail = 300
	}
	if len(detail) > maxDetail {
		detail = detail[:maxDetail-3] + "..."
	}

	prefix := fmt.Sprintf("  %s %s %-12s ",
		dimStyle.Render(ts),
		style.Render(sym),
		headerStyle.Render(repoShort),
	)

	availWidth := m.width - 28
	if availWidth <= 0 || len(detail) <= availWidth {
		return prefix + style.Render(detail) + "\n"
	}

	var b strings.Builder
	indent := strings.Repeat(" ", 28)
	first := true
	for len(detail) > 0 {
		chunk := detail
		if len(chunk) > availWidth {
			cut := availWidth
			for cut > availWidth/2 {
				if detail[cut] == ' ' {
					break
				}
				cut--
			}
			if cut <= availWidth/2 {
				cut = availWidth
			}
			chunk = detail[:cut]
			detail = detail[cut:]
			if len(detail) > 0 && detail[0] == ' ' {
				detail = detail[1:]
			}
		} else {
			detail = ""
		}

		if first {
			b.WriteString(prefix)
			first = false
		} else {
			b.WriteString(indent)
		}
		b.WriteString(style.Render(chunk))
		b.WriteString("\n")
	}

	return b.String()
}

// --- Tea commands ---

func tickCmd(secs int) tea.Cmd {
	return tea.Tick(time.Duration(secs)*time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m Model) fetchHealth() tea.Msg {
	data, err := fetchJSON[healthData](m.cfg, "/health", false)
	return healthMsg{data, err}
}

func (m Model) fetchActivity() tea.Msg {
	events, err := fetchJSONSlice[activityEvent](m.cfg, "/activity?n=100", false)
	return activityMsg{events, err}
}

func (m Model) fetchSessions() tea.Msg {
	events, err := fetchJSONSlice[activityEvent](m.cfg, "/sessions", true)
	return sessionsMsg{events, err}
}

func (m Model) fetchLogs() tea.Msg {
	body, err := doGet(m.cfg, "/logs?repo=unratified", false)
	if err != nil {
		return logsMsg{err: err}
	}
	var result struct {
		Repo  string    `json:"repo"`
		Seq   int64     `json:"seq"`
		Lines []logLine `json:"lines"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return logsMsg{err: err}
	}
	return logsMsg{repo: result.Repo, lines: result.Lines, seq: result.Seq}
}

func (m Model) doPause() tea.Msg {
	_, err := doGet(m.cfg, "/pause", true)
	if err != nil {
		return actionMsg{"", err}
	}
	return actionMsg{"Paused", nil}
}

func (m Model) doResume() tea.Msg {
	_, err := doGet(m.cfg, "/resume", true)
	if err != nil {
		return actionMsg{"", err}
	}
	return actionMsg{"Resumed", nil}
}

func (m Model) doTrigger(repo, prompt string) tea.Cmd {
	return func() tea.Msg {
		body := fmt.Sprintf(`{"repo":%q,"prompt":%q}`, repo, prompt)
		url := m.cfg.Host + "/trigger"
		req, err := http.NewRequest("POST", url, strings.NewReader(body))
		if err != nil {
			return actionMsg{"", err}
		}
		req.Header.Set("Content-Type", "application/json")
		if m.cfg.Token != "" {
			req.Header.Set("Authorization", "Bearer "+m.cfg.Token)
		}
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return actionMsg{"", err}
		}
		defer resp.Body.Close()
		respBody, _ := io.ReadAll(resp.Body)

		var result map[string]any
		json.Unmarshal(respBody, &result)
		if errMsg, ok := result["error"].(string); ok {
			return actionMsg{errMsg, nil}
		}
		return actionMsg{fmt.Sprintf("Triggered %s %s", repo, prompt), nil}
	}
}

// --- HTTP helpers ---

func fetchJSON[T any](cfg Config, path string, auth bool) (*T, error) {
	body, err := doGet(cfg, path, auth)
	if err != nil {
		return nil, err
	}
	var result T
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func fetchJSONSlice[T any](cfg Config, path string, auth bool) ([]T, error) {
	body, err := doGet(cfg, path, auth)
	if err != nil {
		return nil, err
	}
	var result []T
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func doGet(cfg Config, path string, auth bool) ([]byte, error) {
	url := cfg.Host + path
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if auth && cfg.Token != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.Token)
	}
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// --- Rendering helpers ---

func renderBar(width, used, total int) string {
	if total == 0 || width <= 0 {
		return "[?]"
	}
	filled := width * used / total
	if filled > width {
		filled = width
	}
	empty := width - filled

	var color lipgloss.Style
	ratio := float64(used) / float64(total)
	switch {
	case ratio >= 0.9:
		color = redStyle
	case ratio >= 0.7:
		color = yellowStyle
	default:
		color = greenStyle
	}

	bar := color.Render(strings.Repeat("#", filled)) +
		barEmptyStyle.Render(strings.Repeat("-", empty))
	return fmt.Sprintf("[%s] %d/%d", bar, used, total)
}

func formatInterval(secs int) string {
	if secs >= 3600 {
		return fmt.Sprintf("%dh", secs/3600)
	}
	return fmt.Sprintf("%dm", secs/60)
}

func formatCountdown(isoStr string) string {
	if isoStr == "" || isoStr == "pending" {
		return "pending"
	}
	target, err := time.Parse(time.RFC3339, isoStr)
	if err != nil {
		return "?"
	}
	delta := time.Until(target)
	if delta <= 0 {
		return "now"
	}
	m := int(delta.Minutes())
	s := int(delta.Seconds()) % 60
	h := m / 60
	m = m % 60
	if h > 0 {
		return fmt.Sprintf("%dh%02dm", h, m)
	}
	return fmt.Sprintf("%dm%02ds", m, s)
}

func padRight(s string, w int) string {
	if len(s) >= w {
		return s[:w]
	}
	return s + strings.Repeat(" ", w-len(s))
}
