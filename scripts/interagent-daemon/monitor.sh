#!/usr/bin/env bash
# Interagent mesh monitor — unified activity stream.
#
# Usage:
#   ./monitor.sh                    # live tail from gray-box
#   ./monitor.sh status             # one-shot health + recent activity
#   ./monitor.sh activity           # recent activity feed (JSON)
#   ./monitor.sh activity 20        # last 20 events
#   ./monitor.sh logs [repo]        # tail sync logs (optionally filter by repo)
#   ./monitor.sh tail               # tail the main webhook log

set -euo pipefail

# Where the daemon runs — override with INTERAGENT_HOST env var
HOST="${INTERAGENT_HOST:-https://interagent.unratified.org}"

# Auth token for secured endpoints — reads from env file if not set
if [ -z "${INTERAGENT_TOKEN:-}" ]; then
  for envfile in "$HOME/.config/interagent/env" "/Users/kashif/.config/interagent/env"; do
    if [ -f "$envfile" ]; then
      INTERAGENT_TOKEN=$(grep "^WEBHOOK_SECRET=" "$envfile" 2>/dev/null | cut -d= -f2)
      break
    fi
  done
  # Try reading from gray-box if still empty
  if [ -z "${INTERAGENT_TOKEN:-}" ]; then
    INTERAGENT_TOKEN=$(ssh gray-box 'grep "^WEBHOOK_SECRET=" ~/.config/interagent/env 2>/dev/null | cut -d= -f2' 2>/dev/null) || true
  fi
fi
AUTH_HEADER="${INTERAGENT_TOKEN:+-H \"Authorization: Bearer $INTERAGENT_TOKEN\"}"

# Wrapper for authenticated curl calls
_auth_curl() {
  if [ -n "${INTERAGENT_TOKEN:-}" ]; then
    curl -sf -H "Authorization: Bearer $INTERAGENT_TOKEN" "$@"
  else
    curl -sf "$@"
  fi
}

bold="\033[1m"
dim="\033[2m"
red="\033[31m"
green="\033[32m"
yellow="\033[33m"
blue="\033[34m"
cyan="\033[36m"
reset="\033[0m"

cmd="${1:-status}"
shift 2>/dev/null || true

case "$cmd" in
  status)
    echo -e "${bold}=== Interagent Mesh Status ===${reset}"
    echo ""

    health=$(curl -sf "$HOST/health" 2>/dev/null) || {
      echo -e "${red}Cannot reach $HOST — daemon may be down${reset}"
      exit 1
    }

    status=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")
    paused=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['paused'])")
    daily_used=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['budget']['daily_used'])")
    daily_max=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['budget']['daily_max'])")
    in_flight=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); f=d['in_flight']; print(', '.join(f'{k} (PID {v})' for k,v in f.items()) if f else 'none')")
    ts=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['timestamp'][:19])")

    if [ "$paused" = "True" ]; then
      echo -e "  Status:     ${red}PAUSED${reset}"
    else
      echo -e "  Status:     ${green}$status${reset}"
    fi
    echo -e "  Budget:     ${daily_used}/${daily_max} daily runs"
    echo -e "  In-flight:  ${in_flight}"
    echo -e "  Timestamp:  ${dim}${ts}${reset}"

    echo ""
    echo -e "${bold}--- Schedule ---${reset}"
    echo "$health" | python3 -c "
import sys, json
d = json.load(sys.stdin)
sched = d.get('schedule', [])
if not sched:
    print('  (no scheduled tasks)')
else:
    for s in sched:
        interval = s['interval']
        if interval >= 3600:
            freq = f\"{interval // 3600}h\"
        else:
            freq = f\"{interval // 60}m\"
        next_run = s.get('next_run', 'pending')
        if next_run != 'pending':
            next_run = next_run[11:19]
        print(f\"  {s['repo']:20s} {s['prompt']:20s} every {freq:>4s}  next: {next_run}\")
"

    echo ""
    echo -e "${bold}--- Recent Activity ---${reset}"
    activity=$(curl -sf "$HOST/activity?n=15" 2>/dev/null) || {
      echo -e "${dim}(no activity endpoint — update daemon)${reset}"
      exit 0
    }

    echo "$activity" | python3 -c "
import sys, json
events = json.load(sys.stdin)
if not events:
    print('  (no events yet)')
    sys.exit()
colors = {
    'webhook': '\033[36m',     # cyan
    'scheduled': '\033[36m',   # cyan
    'run_start': '\033[32m',   # green
    'run_done': '\033[32m',
    'queued': '\033[35m',      # magenta
    'queue_drain': '\033[35m', # magenta
    'blocked': '\033[33m',     # yellow
    'skipped': '\033[2m',      # dim
    'timeout': '\033[31m',     # red
    'error': '\033[31m',
}
reset = '\033[0m'
for e in events:
    ts = e['ts'][11:19]
    ev = e['event']
    repo = e.get('repo', '')
    detail = e.get('detail', '')
    color = colors.get(ev, '')
    repo_str = f' [{repo}]' if repo else ''
    print(f'  {ts}{repo_str} {color}{ev}{reset}: {detail}')
"
    ;;

  activity)
    n="${1:-50}"
    curl -sf "$HOST/activity?n=$n" | python3 -m json.tool
    ;;

  logs)
    repo_filter="${1:-}"
    if [ -n "$repo_filter" ]; then
      ssh gray-box "ls -t ~/logs/${repo_filter}-sync-*.log 2>/dev/null | head -1 | xargs tail -f"
    else
      ssh gray-box "ls -t ~/logs/*-sync-*.log 2>/dev/null | head -1 | xargs tail -f"
    fi
    ;;

  tail)
    ssh gray-box 'tail -f ~/logs/interagent-webhook.log'
    ;;

  watch)
    # Poll activity every 10 seconds
    echo -e "${bold}Watching interagent mesh (Ctrl+C to stop)...${reset}"
    last_ts=""
    while true; do
      activity=$(curl -sf "$HOST/activity?n=5" 2>/dev/null) || {
        echo -e "${red}Lost connection to $HOST${reset}"
        sleep 10
        continue
      }
      new_ts=$(echo "$activity" | python3 -c "
import sys, json
events = json.load(sys.stdin)
if events:
    print(events[-1]['ts'])
" 2>/dev/null)

      if [ -n "$new_ts" ] && [ "$new_ts" != "$last_ts" ]; then
        echo "$activity" | python3 -c "
import sys, json
events = json.load(sys.stdin)
colors = {
    'webhook': '\033[36m',
    'sync_start': '\033[32m',
    'sync_done': '\033[32m',
    'blocked': '\033[33m',
    'skipped': '\033[2m',
    'timeout': '\033[31m',
    'error': '\033[31m',
}
reset = '\033[0m'
for e in events:
    ts = e['ts'][:19]
    ev = e['event']
    repo = e.get('repo', '')
    detail = e.get('detail', '')
    color = colors.get(ev, '')
    repo_str = f' [{repo}]' if repo else ''
    print(f'{ts}{repo_str} {color}{ev}{reset}: {detail}')
"
        last_ts="$new_ts"
      fi
      sleep 10
    done
    ;;

  sessions)
    echo -e "${bold}=== Recent Sync Sessions ===${reset}"
    echo ""
    sessions=$(_auth_curl "$HOST/sessions" 2>/dev/null) || {
      echo -e "${red}Cannot reach $HOST${reset}"
      exit 1
    }
    echo "$sessions" | python3 -c "
import sys, json
sessions = json.load(sys.stdin)
if not sessions:
    print('  (no sessions with resume capability yet)')
    sys.exit()
for s in sessions:
    ts = s['ts'][:19]
    repo = s.get('repo', '?')
    status = s.get('detail', '?')
    sid = s.get('session_id', '')
    resume = s.get('resume', '')
    rc = s.get('exit_code', '?')
    color = '\033[32m' if rc == 0 else '\033[31m'
    reset = '\033[0m'
    print(f'  {ts} [{repo}] {color}{status}{reset}')
    if resume:
        print(f'    \033[2mresume: {resume}{reset}')
    print()
"
    ;;

  resume)
    # Resume the most recent failed session for a repo
    repo_filter="${1:-}"
    sessions=$(_auth_curl "$HOST/sessions" 2>/dev/null) || {
      echo -e "${red}Cannot reach $HOST${reset}"
      exit 1
    }
    resume_cmd=$(echo "$sessions" | python3 -c "
import sys, json
sessions = json.load(sys.stdin)
repo = '$repo_filter'
# Filter to failed sessions with resume commands
candidates = [s for s in sessions if s.get('resume') and s.get('exit_code', 0) != 0]
if repo:
    candidates = [s for s in candidates if s.get('repo') == repo]
if candidates:
    print(candidates[-1]['resume'])
" 2>/dev/null)

    if [ -z "$resume_cmd" ]; then
      echo -e "${dim}No failed sessions to resume${reset}"
      if [ -n "$repo_filter" ]; then
        echo -e "${dim}(filtered to repo: $repo_filter)${reset}"
      fi
      exit 0
    fi

    echo -e "${bold}Resuming on gray-box:${reset}"
    echo -e "  ${cyan}${resume_cmd}${reset}"
    echo ""
    ssh -t gray-box "$resume_cmd"
    ;;

  trigger)
    repo="${1:?Usage: monitor.sh trigger <repo> [prompt]}"
    prompt="${2:-/sync}"
    echo -e "${bold}Triggering ${cyan}${prompt}${reset} on ${cyan}${repo}${reset}..."
    result=$(_auth_curl -X POST "$HOST/trigger" \
      -H "Content-Type: application/json" \
      -d "{\"repo\": \"$repo\", \"prompt\": \"$prompt\"}" 2>&1) || {
      echo -e "${red}Failed: $result${reset}"
      exit 1
    }
    echo "$result" | python3 -m json.tool
    ;;

  *)
    echo "Usage: monitor.sh [status|activity [n]|sessions|resume [repo]|logs [repo]|tail|watch|trigger <repo> <prompt>]"
    exit 1
    ;;
esac
