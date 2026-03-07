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
	TabStatus Tab = iota
	TabActivity
	TabSessions
)

var tabNames = []string{"Status", "Activity", "Sessions"}

// Config holds TUI settings.
type Config struct {
	Host         string
	Token        string
	RefreshSecs  int
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
	Status    string         `json:"status"`
	Paused    bool           `json:"paused"`
	InFlight  map[string]int `json:"in_flight"`
	Queued    map[string]string `json:"queued"`
	Budget    struct {
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

// Model holds TUI state.
type Model struct {
	cfg        Config
	tab        Tab
	health     *healthData
	activity   []activityEvent
	sessions   []activityEvent
	spinner    spinner.Model
	width      int
	height     int
	scroll     int
	err        error
	lastAction string
	quitting   bool
}

// keybindings
type keyMap struct {
	Quit    key.Binding
	Tab1    key.Binding
	Tab2    key.Binding
	Tab3    key.Binding
	NextTab key.Binding
	PrevTab key.Binding
	Pause   key.Binding
	Resume  key.Binding
	Up      key.Binding
	Down    key.Binding
	PgUp    key.Binding
	PgDown  key.Binding
	Home    key.Binding
	End     key.Binding
}

var keys = keyMap{
	Quit:    key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
	Tab1:    key.NewBinding(key.WithKeys("1"), key.WithHelp("1", "status")),
	Tab2:    key.NewBinding(key.WithKeys("2"), key.WithHelp("2", "activity")),
	Tab3:    key.NewBinding(key.WithKeys("3"), key.WithHelp("3", "sessions")),
	NextTab: key.NewBinding(key.WithKeys("tab", "right", "l"), key.WithHelp("tab/right", "next tab")),
	PrevTab: key.NewBinding(key.WithKeys("shift+tab", "left", "h"), key.WithHelp("shift+tab/left", "prev tab")),
	Pause:   key.NewBinding(key.WithKeys("p"), key.WithHelp("p", "pause")),
	Resume:  key.NewBinding(key.WithKeys("r"), key.WithHelp("r", "resume")),
	Up:      key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("up/k", "scroll up")),
	Down:    key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("down/j", "scroll down")),
	PgUp:    key.NewBinding(key.WithKeys("pgup", "ctrl+u"), key.WithHelp("pgup", "page up")),
	PgDown:  key.NewBinding(key.WithKeys("pgdown", "ctrl+d"), key.WithHelp("pgdn", "page down")),
	Home:    key.NewBinding(key.WithKeys("home", "g"), key.WithHelp("home/g", "top")),
	End:     key.NewBinding(key.WithKeys("end", "G"), key.WithHelp("end/G", "bottom")),
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
		cfg:     cfg,
		tab:     TabStatus,
		spinner: s,
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
			m.tab = TabStatus
			m.scroll = 0
		case key.Matches(msg, keys.Tab2):
			m.tab = TabActivity
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
			m.tab = (m.tab + 2) % 3 // +2 wraps backward
			m.scroll = 0
			if m.tab == TabSessions {
				return m, m.fetchSessions
			}
		case key.Matches(msg, keys.Pause):
			return m, m.doPause
		case key.Matches(msg, keys.Resume):
			return m, m.doResume
		case key.Matches(msg, keys.Up):
			if m.scroll > 0 {
				m.scroll--
			}
		case key.Matches(msg, keys.Down):
			m.scroll++
			m.clampScroll()
		case key.Matches(msg, keys.PgUp):
			m.scroll -= m.pageSize()
			if m.scroll < 0 {
				m.scroll = 0
			}
		case key.Matches(msg, keys.PgDown):
			m.scroll += m.pageSize()
			m.clampScroll()
		case key.Matches(msg, keys.Home):
			m.scroll = 0
		case key.Matches(msg, keys.End):
			m.scroll = m.maxScroll()
		}

	case tea.MouseMsg:
		switch msg.Button {
		case tea.MouseButtonWheelUp:
			if m.scroll > 0 {
				m.scroll -= 3
				if m.scroll < 0 {
					m.scroll = 0
				}
			}
		case tea.MouseButtonWheelDown:
			m.scroll += 3
			m.clampScroll()
		case tea.MouseButtonLeft:
			// Click on tab bar (row 1, tabs start at col 0)
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
			tickCmd(m.cfg.RefreshSecs),
		)

	case healthMsg:
		m.health = msg.data
		m.err = msg.err

	case activityMsg:
		if msg.err == nil {
			m.activity = msg.events
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
	// Tab labels: " 1:Status  2:Activity  3:Sessions "
	// Each tab occupies roughly: label width + 2 padding
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
	ps := m.height - 8
	if ps < 5 {
		ps = 5
	}
	return ps
}

// maxScroll returns the maximum valid scroll offset for the current tab.
func (m Model) maxScroll() int {
	var total int
	switch m.tab {
	case TabActivity:
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

	if m.err != nil && m.health == nil {
		b.WriteString(redStyle.Render(fmt.Sprintf("  Cannot reach %s", m.cfg.Host)))
		b.WriteString("\n")
		b.WriteString(dimStyle.Render(fmt.Sprintf("  %v", m.err)))
		b.WriteString("\n")
	} else {
		switch m.tab {
		case TabStatus:
			b.WriteString(m.viewStatus())
		case TabActivity:
			b.WriteString(m.viewActivity())
		case TabSessions:
			b.WriteString(m.viewSessions())
		}
	}

	// Footer
	b.WriteString("\n")
	footer := fmt.Sprintf(" %s | q:quit arrows:nav p:pause r:resume pgup/dn:page | refresh %ds ",
		m.cfg.Host, m.cfg.RefreshSecs)
	if m.lastAction != "" {
		footer += "| " + m.lastAction + " "
	}
	b.WriteString(footerStyle.Render(padRight(footer, w)))

	return b.String()
}

func (m Model) viewStatus() string {
	if m.health == nil {
		return fmt.Sprintf("  %s Loading...\n", m.spinner.View())
	}

	h := m.health
	var b strings.Builder

	// Status
	if h.Paused {
		b.WriteString(redStyle.Bold(true).Render("  ** PAUSED"))
	} else {
		b.WriteString(greenStyle.Bold(true).Render("  ** ACTIVE"))
	}
	ts := h.Timestamp
	if len(ts) > 19 {
		ts = ts[:19]
	}
	b.WriteString(dimStyle.Render("  " + ts))
	b.WriteString("\n\n")

	// Budget bar
	barW := min(30, m.width-20)
	b.WriteString("  ")
	b.WriteString(dimStyle.Render("Budget "))
	b.WriteString(renderBar(barW, h.Budget.DailyUsed, h.Budget.DailyMax))
	b.WriteString("\n\n")

	// In-flight
	if len(h.InFlight) > 0 {
		for repo, pid := range h.InFlight {
			b.WriteString(greenStyle.Bold(true).Render(fmt.Sprintf("  -> %s", repo)))
			b.WriteString(dimStyle.Render(fmt.Sprintf(" PID %d", pid)))
			if prompt, ok := h.Queued[repo]; ok {
				b.WriteString(magentaStyle.Render(fmt.Sprintf("  .. queued: %s", prompt)))
			}
			b.WriteString("\n")
		}
	} else if len(h.Queued) > 0 {
		for repo, prompt := range h.Queued {
			b.WriteString(magentaStyle.Render(fmt.Sprintf("  .. %s: %s", repo, prompt)))
			b.WriteString("\n")
		}
	} else {
		b.WriteString(dimStyle.Render("  idle"))
		b.WriteString("\n")
	}

	// Cooldowns
	for repo, secs := range h.Cooldowns {
		if secs > 0 {
			b.WriteString(yellowStyle.Render(fmt.Sprintf("  || %s cooldown %ds", repo, secs)))
			b.WriteString("\n")
		}
	}
	b.WriteString("\n")

	// Schedule
	if len(h.Schedule) > 0 {
		b.WriteString(headerStyle.Render("  SCHEDULE"))
		b.WriteString("\n")
		for _, task := range h.Schedule {
			freq := formatInterval(task.Interval)
			countdown := formatCountdown(task.NextRun)

			line := fmt.Sprintf("  %s: %s", task.Repo, task.Prompt)
			b.WriteString(dimStyle.Render(line))

			right := fmt.Sprintf("  ~~ %s (%s)", countdown, freq)
			style := cyanStyle
			if countdown == "now" {
				style = greenStyle.Bold(true)
			}
			b.WriteString(style.Render(right))
			b.WriteString("\n")
		}
	}

	return b.String()
}

func (m Model) viewActivity() string {
	if len(m.activity) == 0 {
		return dimStyle.Render("  (no events)\n")
	}

	var b strings.Builder
	b.WriteString(headerStyle.Render("  ACTIVITY FEED"))
	b.WriteString(dimStyle.Render(fmt.Sprintf("  (%d events)", len(m.activity))))
	b.WriteString("\n\n")

	maxVisible := m.height - 8
	if maxVisible < 5 {
		maxVisible = 5
	}

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

	// Allow up to 300 chars (Bluesky post length) before truncating
	maxDetail := m.width - 28
	if maxDetail < 300 {
		maxDetail = 300
	}
	if len(detail) > maxDetail {
		detail = detail[:maxDetail-3] + "..."
	}

	// Prefix columns: "  HH:MM:SS XX reponame____ "
	prefix := fmt.Sprintf("  %s %s %-12s ",
		dimStyle.Render(ts),
		style.Render(sym),
		headerStyle.Render(repoShort),
	)

	// Wrap detail text if it exceeds terminal width
	availWidth := m.width - 28
	if availWidth <= 0 || len(detail) <= availWidth {
		return prefix + style.Render(detail) + "\n"
	}

	// Word-wrap the detail into continuation lines
	var b strings.Builder
	indent := strings.Repeat(" ", 28) // align continuation with detail column
	first := true
	for len(detail) > 0 {
		chunk := detail
		if len(chunk) > availWidth {
			// Try to break at a space
			cut := availWidth
			for cut > availWidth/2 {
				if detail[cut] == ' ' {
					break
				}
				cut--
			}
			if cut <= availWidth/2 {
				cut = availWidth // no good break point, hard wrap
			}
			chunk = detail[:cut]
			detail = detail[cut:]
			// Skip leading space on next line
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
