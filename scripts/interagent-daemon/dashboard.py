#!/usr/bin/env python3
"""
Interagent mesh dashboard — live terminal TUI.

Polls the daemon's /health, /activity, and /sessions endpoints
and renders a continuously updating display.

Usage:
    python3 dashboard.py                          # default: interagent.unratified.org
    python3 dashboard.py http://localhost:8787     # local
    INTERAGENT_TOKEN=xxx python3 dashboard.py     # with auth

Reads WEBHOOK_SECRET from ~/.config/interagent/env if INTERAGENT_TOKEN not set.
"""
from __future__ import annotations

import curses
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path


def _load_token() -> str:
    token = os.environ.get("INTERAGENT_TOKEN", "")
    if token:
        return token
    for envfile in [
        Path.home() / ".config" / "interagent" / "env",
        Path("/Users/kashif/.config/interagent/env"),
    ]:
        if envfile.exists():
            for line in envfile.read_text().splitlines():
                if line.startswith("WEBHOOK_SECRET="):
                    return line.split("=", 1)[1].strip()
    return ""


HOST = sys.argv[1] if len(sys.argv) > 1 else "https://interagent.unratified.org"
TOKEN = _load_token()
REFRESH = 5  # seconds


def _fetch(path: str, auth: bool = False) -> dict | list | None:
    url = f"{HOST}{path}"
    req = urllib.request.Request(url)
    if auth and TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def _bar(width: int, used: int, total: int, label: str = "") -> str:
    if total == 0:
        return f"[{'?' * width}]"
    filled = int(width * used / total)
    empty = width - filled
    pct = f" {used}/{total}"
    bar = "█" * filled + "░" * empty
    return f"{label}[{bar}]{pct}"


def _countdown(iso_str: str) -> str:
    try:
        target = datetime.fromisoformat(iso_str)
        delta = (target - datetime.now()).total_seconds()
        if delta <= 0:
            return "now"
        m, s = divmod(int(delta), 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{h}h{m:02d}m"
        return f"{m}m{s:02d}s"
    except Exception:
        return "?"


EVENT_SYMBOLS = {
    "webhook": "⚡",
    "scheduled": "⏰",
    "run_start": "▶ ",
    "run_done": "✓ ",
    "queued": "⏳",
    "queue_drain": "⏳",
    "blocked": "⛔",
    "skipped": "· ",
    "timeout": "⏱ ",
    "error": "✗ ",
}


def draw(stdscr):
    curses.curs_set(0)
    curses.use_default_colors()

    # Define color pairs
    curses.init_pair(1, curses.COLOR_GREEN, -1)
    curses.init_pair(2, curses.COLOR_RED, -1)
    curses.init_pair(3, curses.COLOR_YELLOW, -1)
    curses.init_pair(4, curses.COLOR_CYAN, -1)
    curses.init_pair(5, curses.COLOR_MAGENTA, -1)
    curses.init_pair(6, curses.COLOR_WHITE, -1)

    GREEN = curses.color_pair(1)
    RED = curses.color_pair(2)
    YELLOW = curses.color_pair(3)
    CYAN = curses.color_pair(4)
    MAGENTA = curses.color_pair(5)
    DIM = curses.color_pair(6) | curses.A_DIM
    BOLD = curses.A_BOLD
    REVERSE = curses.A_REVERSE

    EVENT_COLORS = {
        "webhook": CYAN,
        "scheduled": CYAN,
        "run_start": GREEN,
        "run_done": GREEN,
        "queued": MAGENTA,
        "queue_drain": MAGENTA,
        "blocked": YELLOW,
        "skipped": DIM,
        "timeout": RED,
        "error": RED,
    }

    last_error = ""
    consecutive_errors = 0

    while True:
        stdscr.erase()
        height, width = stdscr.getmaxyx()
        if width < 40 or height < 10:
            stdscr.addstr(0, 0, "Terminal too small")
            stdscr.refresh()
            time.sleep(1)
            continue

        row = 0

        # Header
        title = " INTERAGENT MESH "
        pad = (width - len(title)) // 2
        try:
            stdscr.addstr(row, 0, " " * width, REVERSE)
            stdscr.addstr(row, pad, title, REVERSE | BOLD)
        except curses.error:
            pass
        row += 1

        # Fetch health
        health = _fetch("/health")
        if not health:
            consecutive_errors += 1
            stdscr.addstr(row, 1, f"Cannot reach {HOST}", RED | BOLD)
            row += 1
            if consecutive_errors > 1:
                stdscr.addstr(row, 1, f"({consecutive_errors} consecutive failures)", DIM)
            stdscr.refresh()
            time.sleep(REFRESH)
            continue

        consecutive_errors = 0

        # Status line
        status = health.get("status", "?")
        paused = health.get("paused", False)
        ts = health.get("timestamp", "")[:19]

        if paused:
            stdscr.addstr(row, 1, "● PAUSED", RED | BOLD)
        else:
            stdscr.addstr(row, 1, "● ", GREEN | BOLD)
            stdscr.addstr("ACTIVE", GREEN)

        stdscr.addstr(row, width - len(ts) - 1, ts, DIM)
        row += 1

        # Budget bar
        budget = health.get("budget", {})
        daily_used = budget.get("daily_used", 0)
        daily_max = budget.get("daily_max", 30)
        bar_width = min(30, width - 20)
        budget_color = GREEN if daily_used < daily_max * 0.7 else (YELLOW if daily_used < daily_max * 0.9 else RED)
        stdscr.addstr(row, 1, "Budget ", DIM)
        stdscr.addstr(_bar(bar_width, daily_used, daily_max), budget_color)
        row += 1

        # In-flight
        in_flight = health.get("in_flight", {})
        queued = health.get("queued", {})
        if in_flight:
            for repo, pid in in_flight.items():
                stdscr.addstr(row, 1, f"▶ {repo}", GREEN | BOLD)
                stdscr.addstr(f" PID {pid}", DIM)
                if repo in queued:
                    stdscr.addstr(f"  ⏳ queued: {queued[repo]}", MAGENTA)
                row += 1
        elif queued:
            for repo, prompt in queued.items():
                stdscr.addstr(row, 1, f"⏳ {repo}: {prompt}", MAGENTA)
                row += 1
        else:
            stdscr.addstr(row, 1, "  idle", DIM)
            row += 1

        # Cooldowns
        cooldowns = health.get("cooldowns", {})
        if cooldowns:
            for repo, secs in cooldowns.items():
                if secs > 0:
                    stdscr.addstr(row, 1, f"  ⏸ {repo} cooldown {secs}s", YELLOW)
                    row += 1

        row += 1

        # Schedule
        schedule = health.get("schedule", [])
        if schedule:
            stdscr.addstr(row, 1, "SCHEDULE", BOLD)
            row += 1
            for task in schedule:
                repo = task.get("repo", "?")
                prompt = task.get("prompt", "?")
                interval = task.get("interval", 0)
                next_run = task.get("next_run", "")

                freq = f"{interval // 3600}h" if interval >= 3600 else f"{interval // 60}m"
                countdown = _countdown(next_run) if next_run != "pending" else "pending"

                line = f"  {repo}: {prompt}"
                stdscr.addstr(row, 1, line[:width - 20], DIM)

                right = f"⏱ {countdown} ({freq})"
                col = max(len(line) + 3, width - len(right) - 2)
                if col + len(right) < width:
                    color = CYAN if countdown != "now" else GREEN | BOLD
                    stdscr.addstr(row, col, right, color)
                row += 1

        row += 1

        # Activity feed — fill remaining space
        remaining = height - row - 1
        if remaining < 3:
            stdscr.refresh()
            time.sleep(REFRESH)
            continue

        stdscr.addstr(row, 1, "ACTIVITY", BOLD)
        n = max(remaining - 1, 5)
        activity = _fetch(f"/activity?n={n}")
        row += 1

        if not activity:
            stdscr.addstr(row, 1, "(no events)", DIM)
        else:
            for event in activity:
                if row >= height - 1:
                    break

                ts = event.get("ts", "")[11:19]
                ev = event.get("event", "?")
                repo = event.get("repo", "")
                detail = event.get("detail", "")
                prompt = event.get("prompt", "")

                sym = EVENT_SYMBOLS.get(ev, "  ")
                color = EVENT_COLORS.get(ev, DIM)

                # Time
                stdscr.addstr(row, 1, ts, DIM)

                # Symbol + event
                stdscr.addstr(row, 10, sym, color)

                # Repo
                repo_short = repo[:12] if repo else ""
                stdscr.addstr(row, 13, repo_short, BOLD)

                # Detail (truncated to fit)
                detail_col = 26
                detail_text = detail
                if prompt and prompt != "/sync":
                    detail_text = f"[{prompt}] {detail}"
                max_detail = width - detail_col - 1
                if max_detail > 0:
                    stdscr.addstr(row, detail_col, detail_text[:max_detail], color)

                row += 1

        # Footer
        try:
            footer = f" {HOST}  |  q: quit  |  p: pause  |  r: resume  |  ↻ {REFRESH}s "
            stdscr.addstr(height - 1, 0, " " * width, REVERSE)
            stdscr.addstr(height - 1, 1, footer[:width - 2], REVERSE | DIM)
        except curses.error:
            pass

        stdscr.refresh()

        # Handle input (non-blocking)
        stdscr.timeout(REFRESH * 1000)
        try:
            key = stdscr.getch()
            if key == ord("q"):
                return
            elif key == ord("p"):
                _fetch("/pause", auth=True)
            elif key == ord("r"):
                _fetch("/resume", auth=True)
            elif key == ord("+"):
                REFRESH = min(REFRESH + 1, 30)
            elif key == ord("-"):
                REFRESH = max(REFRESH - 1, 1)
        except Exception:
            pass


if __name__ == "__main__":
    try:
        curses.wrapper(draw)
    except KeyboardInterrupt:
        pass
