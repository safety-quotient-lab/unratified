# Interagent Mesh Daemon

Keeps unratified.org updating itself. Two trigger sources:

1. **Reactive** — GitHub PR webhooks trigger `/sync` when agents open PRs
2. **Proactive** — Built-in scheduler runs `/hunt` hourly to discover and execute work

## Architecture

```
                     ┌──────────────────┐
                     │  GitHub webhooks  │
                     │  (PR events)      │
                     └────────┬─────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────┐
│              interagent mesh daemon                  │
│              (gray-box :8787)                        │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ webhook  │  │ scheduler │  │ budget + cooldown │  │
│  │ receiver │  │ (hourly)  │  │ + dedup + timeout │  │
│  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘  │
│       │              │                  │            │
│       └──────┬───────┘                  │            │
│              ▼                          │            │
│     ┌─────────────────┐                │            │
│     │  trigger_claude  │◄───────────────┘            │
│     │  claude -p "..."  │                             │
│     └────────┬─────────┘                             │
│              │                                       │
│   ┌──────────┼──────────┐                           │
│   ▼          ▼          ▼                           │
│ /sync     /hunt      /trigger                       │
│ (merge)   (discover)  (manual)                      │
└─────────────────────────────────────────────────────┘
              │
              ▼
     git push → Cloudflare Pages → unratified.org
```

Runs on **gray-box** (macOS, always-on) via launchd.

## Components

| File | Purpose |
|---|---|
| `webhook-listener.py` | Daemon: webhooks, scheduler, budget, session tracking |
| `monitor.sh` | CLI: status, activity feed, sessions, resume, trigger, log tailing |
| `setup-macos.sh` | One-time setup: env file, launchd plists, wrapper script |
| `run-webhook.sh` | Generated wrapper that sources env before starting daemon |
| `com.unratified.interagent-webhook.plist` | launchd agent template for daemon |
| `com.unratified.interagent-tunnel.plist` | launchd agent template for cloudflared tunnel |

## Safety Guardrails

| Guard | Default | Env var |
|---|---|---|
| Per-repo dedup | 1 sync at a time per repo | — |
| Cooldown | 5 min between syncs per repo | `COOLDOWN_SECONDS` |
| Hourly rate limit | 6 syncs/hour/repo | `MAX_SYNCS_PER_HOUR` |
| Daily budget | 30 syncs/day total | `MAX_SYNCS_PER_DAY` |
| Process timeout | 600s (10 min) | `SYNC_TIMEOUT_SECONDS` |
| Kill switch | `touch ~/INTERAGENT_PAUSE` | — |
| Branch filter | Only branches containing "agent" | — |
| Signature verification | HMAC-SHA256 via `WEBHOOK_SECRET` | — |

These guardrails ensure the system operates at human speed — a 5-minute cooldown per repo means a human can review what happened between syncs, and the daily budget caps total cost. If agents enter a rapid back-and-forth, excess webhooks are logged as `blocked` events but not acted on.

## Monitor

The `monitor.sh` script provides a unified view of mesh activity from any machine.

### Commands

```bash
# One-shot status: health, schedule, last 15 events (color-coded)
./monitor.sh status

# Raw activity feed as JSON (default 50 events)
./monitor.sh activity
./monitor.sh activity 20        # last 20 events

# Live watch: polls every 10s, prints new events
./monitor.sh watch

# Show recent sessions with resume commands
./monitor.sh sessions

# Resume the most recent failed session (SSH into gray-box)
./monitor.sh resume             # any failed session
./monitor.sh resume unratified  # failed session for specific repo

# Manually trigger a prompt on a repo
./monitor.sh trigger unratified "/sync"
./monitor.sh trigger unratified "/hunt quick"

# Tail the main daemon log via SSH
./monitor.sh tail

# Tail the most recent run log
./monitor.sh logs               # most recent across all repos
./monitor.sh logs unratified    # most recent for a specific repo
```

Override the daemon URL with `INTERAGENT_HOST`:

```bash
INTERAGENT_HOST=http://localhost:8787 ./monitor.sh status
```

### Event Types

| Event | Color | Meaning |
|---|---|---|
| `webhook` | cyan | GitHub PR webhook received |
| `scheduled` | cyan | Scheduler triggered a task |
| `run_start` | green | `claude -p` spawned |
| `run_done` | green | Run completed (OK or FAILED with session ID) |
| `blocked` | yellow | Run denied (budget, dedup, cooldown, or paused) |
| `skipped` | dim | Non-agent branch or unconfigured repo |
| `timeout` | red | Run killed after exceeding timeout |
| `error` | red | Process failed to start |

### Human Takeover

When a run fails or times out, the daemon captures the Claude Code session ID. A human can resume the conversation interactively:

```bash
# See recent sessions with resume commands
./monitor.sh sessions

# Resume the most recent failed session
./monitor.sh resume

# Or manually on gray-box:
cd ~/projects/unratified && claude --resume <session-id>
```

## API Endpoints

All accessible via `https://interagent.unratified.org/` or `http://localhost:8787/` on gray-box.

| Method | Path | Description |
|---|---|---|
| `POST` | `/` | GitHub webhook receiver |
| `POST` | `/trigger` | Manual trigger: `{"repo": "...", "prompt": "..."}` |
| `GET` | `/health` | System status, budget, schedule, in-flight |
| `GET` | `/activity` | Activity feed (JSON, filterable) |
| `GET` | `/sessions` | Recent sessions with resume commands |
| `GET` | `/pause` | Activate kill switch |
| `GET` | `/resume` | Deactivate kill switch |

Activity feed supports query parameters:

```
/activity?n=20              # limit to 20 events
/activity?repo=unratified   # filter by repo
/activity?event=run_done    # filter by event type
/activity?repo=observatory&event=error&n=10  # combine filters
```

## Schedule

The daemon includes a built-in scheduler. Default schedule (configurable via `SCHEDULE` env var):

| Repo | Prompt | Interval |
|---|---|---|
| unratified | `/hunt quick` | 1 hour |
| unratified | `/sync` | 1 hour |

Tasks are staggered by 5 minutes to avoid thundering herd. All scheduled runs go through the same budget/cooldown/dedup system as webhook-triggered runs.

## Setup

### Prerequisites

- macOS with Homebrew (gray-box)
- `cloudflared` (`brew install cloudflared`)
- `gh` CLI (`brew install gh`), authenticated
- Node.js + Claude Code (`npm install -g @anthropic-ai/claude-code`)
- `ANTHROPIC_API_KEY` for Claude API access

### Initial Setup

```bash
# On gray-box:
cd ~/projects/unratified/scripts/interagent-daemon
bash setup-macos.sh

# Add API key:
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> ~/.config/interagent/env

# Set up cloudflared tunnel:
cloudflared tunnel login
cloudflared tunnel create interagent
# Note the tunnel ID, then:
cat > ~/.cloudflared/config-interagent.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /Users/kashif/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: interagent.unratified.org
    service: http://localhost:8787
  - service: http_status:404
EOF
cloudflared tunnel route dns <TUNNEL_ID> interagent.unratified.org

# Start services:
launchctl load ~/Library/LaunchAgents/com.unratified.interagent-webhook.plist
launchctl load ~/Library/LaunchAgents/com.unratified.interagent-tunnel.plist

# Verify:
curl http://localhost:8787/health
```

### Managing Services

```bash
# Stop
launchctl unload ~/Library/LaunchAgents/com.unratified.interagent-webhook.plist
launchctl unload ~/Library/LaunchAgents/com.unratified.interagent-tunnel.plist

# Restart (stop + start)
launchctl unload ~/Library/LaunchAgents/com.unratified.interagent-webhook.plist
launchctl load ~/Library/LaunchAgents/com.unratified.interagent-webhook.plist

# Emergency stop (all syncs)
curl https://interagent.unratified.org/pause

# Resume
curl https://interagent.unratified.org/resume
```

Both services are configured with `KeepAlive` and `RunAtLoad` — they survive reboots and auto-restart on crash.

### GitHub Webhooks

Webhooks are configured on all three mesh repos:

- `safety-quotient-lab/unratified`
- `safety-quotient-lab/observatory`
- `safety-quotient-lab/psychology-agent`

Settings: content type `application/json`, secret from `~/.config/interagent/env`, events: Pull requests only.

## Logs

All logs live in `~/logs/` on gray-box:

| File | Content |
|---|---|
| `interagent-webhook.log` | Main daemon log (all events) |
| `interagent-webhook-stdout.log` | launchd stdout capture |
| `interagent-webhook-stderr.log` | launchd stderr capture |
| `{repo}-sync-{timestamp}.log` | Per-sync Claude Code output |
| `interagent-tunnel-*.log` | cloudflared tunnel logs |
