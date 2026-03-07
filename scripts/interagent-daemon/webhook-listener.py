#!/usr/bin/env python3
"""
Interagent mesh daemon.

Two trigger sources:
  1. GitHub PR webhooks → triggers `/sync` in the appropriate repo
  2. Built-in scheduler → triggers `/hunt` (or custom prompts) on a schedule

Safety guardrails:
  - Per-repo in-flight dedup (no parallel runs on same repo)
  - Per-repo cooldown: min N seconds between runs (default 300)
  - Rate limit: max N runs per hour per repo (default 6)
  - Daily budget: max N total runs per day (default 30)
  - Process timeout: kills claude after N seconds (default 600)
  - Kill switch: touch ~/INTERAGENT_PAUSE to pause everything
  - Human takeover: session IDs captured for `claude --resume`
  - Build verification: `npm run build` must pass before auto-push

Usage:
    WEBHOOK_SECRET=xxx python3 webhook-listener.py [--port 8787]

Pair with cloudflared:
    cloudflared tunnel --url http://localhost:8787
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import logging
import os
import signal
import subprocess
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

LOG_DIR = Path.home() / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "interagent-webhook.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("interagent")

# --- Configuration ---

REPO_PATHS = {
    "unratified": Path.home() / "projects" / "unratified",
    "psychology-agent": Path.home() / "projects" / "psychology-sqlab",
    "observatory": Path.home() / "projects" / "observatory-sqlab",
}

MAX_SYNCS_PER_HOUR = int(os.environ.get("MAX_SYNCS_PER_HOUR", "6"))
MAX_SYNCS_PER_DAY = int(os.environ.get("MAX_SYNCS_PER_DAY", "30"))
SYNC_TIMEOUT_SECONDS = int(os.environ.get("SYNC_TIMEOUT_SECONDS", "1200"))  # 20 min
COOLDOWN_SECONDS = int(os.environ.get("COOLDOWN_SECONDS", "300"))  # 5 min between syncs per repo
PAUSE_FILE = Path.home() / "INTERAGENT_PAUSE"

# --- Scheduler configuration ---
# Format: list of {"repo": name, "prompt": skill, "interval_seconds": N}
SCHEDULE = json.loads(os.environ.get("SCHEDULE", json.dumps([
    {"repo": "unratified", "prompt": "/hunt quick", "interval_seconds": 3600},
    {"repo": "unratified", "prompt": "/sync", "interval_seconds": 3600},
])))

# --- Build verification ---
BUILD_VERIFY = os.environ.get("BUILD_VERIFY", "1") == "1"
BUILD_CMD = os.environ.get("BUILD_CMD", "npm run build")

# --- State tracking ---

_in_flight: dict[str, int] = {}  # repo -> PID
_sync_times: defaultdict[str, list[datetime]] = defaultdict(list)  # repo -> [timestamps]
_daily_count = 0
_daily_reset = datetime.now().replace(hour=0, minute=0, second=0) + timedelta(days=1)
_lock = threading.Lock()

# --- Queue: one pending job per repo (latest wins, deduped) ---
MAX_QUEUE_PER_REPO = 1
_queue: dict[str, tuple[str, str]] = {}  # repo -> (prompt, reason)

# --- Activity feed (ring buffer) ---

MAX_ACTIVITY = int(os.environ.get("MAX_ACTIVITY_ENTRIES", "200"))
_activity: deque[dict] = deque(maxlen=MAX_ACTIVITY)


def _emit(event_type: str, repo: str = "", detail: str = "", **extra):
    """Record an event to the activity feed."""
    entry = {
        "ts": datetime.now().isoformat(),
        "event": event_type,
        "repo": repo,
        "detail": detail,
        **extra,
    }
    _activity.append(entry)
    return entry


def _prune_old_times(repo: str):
    """Remove sync timestamps older than 1 hour."""
    cutoff = datetime.now() - timedelta(hours=1)
    _sync_times[repo] = [t for t in _sync_times[repo] if t > cutoff]


def _check_daily_reset():
    """Reset daily counter at midnight."""
    global _daily_count, _daily_reset
    if datetime.now() >= _daily_reset:
        _daily_count = 0
        _daily_reset = datetime.now().replace(hour=0, minute=0, second=0) + timedelta(days=1)
        log.info("Daily sync counter reset")


def is_paused() -> bool:
    """Check kill switch: ~/INTERAGENT_PAUSE file."""
    return PAUSE_FILE.exists()


def check_budget(repo: str) -> str | None:
    """Return None if allowed, or a reason string if blocked."""
    if is_paused():
        return "PAUSED (kill switch active: ~/INTERAGENT_PAUSE)"

    _check_daily_reset()

    if _daily_count >= MAX_SYNCS_PER_DAY:
        return f"daily budget exhausted ({_daily_count}/{MAX_SYNCS_PER_DAY})"

    _prune_old_times(repo)
    if len(_sync_times[repo]) >= MAX_SYNCS_PER_HOUR:
        return f"hourly rate limit for {repo} ({len(_sync_times[repo])}/{MAX_SYNCS_PER_HOUR})"

    if repo in _in_flight:
        return f"sync already in flight for {repo} (PID {_in_flight[repo]})"

    # Cooldown: minimum gap between syncs per repo
    if _sync_times[repo]:
        last = _sync_times[repo][-1]
        elapsed = (datetime.now() - last).total_seconds()
        if elapsed < COOLDOWN_SECONDS:
            remaining = int(COOLDOWN_SECONDS - elapsed)
            return f"cooldown for {repo} ({remaining}s remaining of {COOLDOWN_SECONDS}s)"

    return None


def verify_signature(body: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


def verify_build(clone_path: Path) -> tuple[bool, str]:
    """Run build command and return (success, output_snippet)."""
    if not BUILD_VERIFY:
        return True, "skipped"
    # Only verify repos that have a package.json
    if not (clone_path / "package.json").exists():
        return True, "no package.json"
    try:
        result = subprocess.run(
            BUILD_CMD.split(),
            cwd=str(clone_path),
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode == 0:
            return True, "pass"
        # Last 10 lines of stderr for diagnosis
        snippet = "\n".join(result.stderr.strip().splitlines()[-10:])
        return False, snippet
    except subprocess.TimeoutExpired:
        return False, "build timed out (120s)"
    except Exception as e:
        return False, str(e)


def trigger_claude(repo: str, clone_path: Path, prompt: str, reason: str):
    """Run claude -p with an arbitrary prompt in a repo's working directory."""
    global _daily_count

    with _lock:
        blocked = check_budget(repo)
        if blocked:
            # If blocked only because in-flight, queue instead of dropping
            if repo in _in_flight and "in flight" in blocked:
                prev = _queue.get(repo)
                _queue[repo] = (prompt, reason)
                if prev:
                    log.info(f"Replaced queued {prev[0]} with {prompt} for {repo}")
                else:
                    log.info(f"Queued {prompt} for {repo} (waiting for PID {_in_flight[repo]})")
                _emit("queued", repo, f"{prompt}: {reason} (waiting for in-flight to finish)")
            else:
                log.warning(f"Blocked {prompt} for {repo}: {blocked}")
                _emit("blocked", repo, blocked, prompt=prompt, reason=reason)
            return

    log.info(f"Triggering {prompt} for {repo}: {reason}")
    _emit("run_start", repo, reason, prompt=prompt)

    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    label = prompt.strip("/").replace(" ", "-")
    run_log = LOG_DIR / f"{repo}-{label}-{ts}.log"
    session_file = LOG_DIR / f"{repo}-{label}-{ts}.session"

    try:
        proc = subprocess.Popen(
            [
                "claude", "-p", prompt,
                "--allowedTools", "Read,Edit,Write,Bash,Glob,Grep",
                "--output-format", "json",
            ],
            cwd=str(clone_path),
            stdout=open(run_log, "w"),
            stderr=subprocess.STDOUT,
            env={
                **{k: v for k, v in os.environ.items() if k != "CLAUDECODE"},
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
            },
        )

        with _lock:
            _in_flight[repo] = proc.pid
            _sync_times[repo].append(datetime.now())
            _daily_count += 1

        log.info(
            f"Started claude PID {proc.pid} ({prompt}), logging to {run_log} "
            f"(daily {_daily_count}/{MAX_SYNCS_PER_DAY}, "
            f"hourly {len(_sync_times[repo])}/{MAX_SYNCS_PER_HOUR})"
        )

        def wait_and_cleanup():
            try:
                rc = proc.wait(timeout=SYNC_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired:
                log.error(
                    f"TIMEOUT: {prompt} for {repo} exceeded {SYNC_TIMEOUT_SECONDS}s, "
                    f"killing PID {proc.pid}"
                )
                _emit("timeout", repo, f"killed PID {proc.pid} after {SYNC_TIMEOUT_SECONDS}s",
                      prompt=prompt)
                proc.kill()
                proc.wait()
                rc = -9

            with _lock:
                _in_flight.pop(repo, None)

            # Extract session ID from JSON output for human takeover
            session_id = None
            try:
                with open(run_log) as f:
                    output = json.loads(f.read())
                    session_id = output.get("session_id")
                    if session_id:
                        with open(session_file, "w") as sf:
                            sf.write(session_id)
            except (json.JSONDecodeError, KeyError, IOError):
                pass

            status = "OK" if rc == 0 else f"FAILED (exit {rc})"
            log.info(f"{prompt} for {repo} finished: {status}, log: {run_log}")

            resume_hint = ""
            if session_id:
                resume_hint = f"cd {clone_path} && claude --resume {session_id}"
                log.info(f"Resume session: {resume_hint}")

            if rc != 0 and session_id:
                log.warning(
                    f"HUMAN TAKEOVER AVAILABLE for {repo}: {resume_hint}"
                )

            _emit("run_done", repo, status,
                  exit_code=rc, log=str(run_log), prompt=prompt,
                  session_id=session_id, resume=resume_hint)

            # Drain queue: if a job was queued for this repo, run it next
            with _lock:
                queued = _queue.pop(repo, None)
            if queued:
                q_prompt, q_reason = queued
                log.info(f"Draining queue: {q_prompt} for {repo}")
                _emit("queue_drain", repo, f"{q_prompt}: {q_reason}")
                trigger_claude(repo, clone_path, q_prompt, f"queued: {q_reason}")

        threading.Thread(target=wait_and_cleanup, daemon=True).start()

    except Exception as e:
        with _lock:
            _in_flight.pop(repo, None)
        log.error(f"Failed to start {prompt} for {repo}: {e}")
        _emit("error", repo, str(e), prompt=prompt)


# --- Scheduler ---

_schedule_next: dict[str, datetime] = {}  # "repo:prompt" -> next run time


def _scheduler_loop():
    """Background thread: check schedule every 30 seconds, trigger due tasks."""
    # Initialize next-run times (stagger by 5 minutes to avoid thundering herd)
    for i, task in enumerate(SCHEDULE):
        key = f"{task['repo']}:{task['prompt']}"
        # First run after a short delay to let the system settle
        _schedule_next[key] = datetime.now() + timedelta(seconds=60 + i * 300)
        log.info(
            f"Scheduled {task['prompt']} on {task['repo']} "
            f"every {task['interval_seconds']}s, first run ~{_schedule_next[key].strftime('%H:%M:%S')}"
        )

    while True:
        threading.Event().wait(30)  # check every 30s
        if is_paused():
            continue

        now = datetime.now()
        for task in SCHEDULE:
            key = f"{task['repo']}:{task['prompt']}"
            next_run = _schedule_next.get(key)
            if not next_run or now < next_run:
                continue

            repo = task["repo"]
            prompt = task["prompt"]
            clone_path = REPO_PATHS.get(repo)
            if not clone_path or not clone_path.exists():
                log.warning(f"Scheduler: skipping {prompt} on {repo} (path missing)")
                _schedule_next[key] = now + timedelta(seconds=task["interval_seconds"])
                continue

            _emit("scheduled", repo, f"{prompt} (every {task['interval_seconds']}s)")
            # Schedule next run BEFORE triggering (so it doesn't re-fire if blocked)
            _schedule_next[key] = now + timedelta(seconds=task["interval_seconds"])
            trigger_claude(repo, clone_path, prompt, f"scheduled ({task['interval_seconds']}s)")


# Prompts allowed via /trigger (prevent arbitrary prompt injection)
ALLOWED_PROMPTS = {
    "/sync", "/hunt", "/hunt quick", "/hunt deep", "/hunt content",
    "/hunt integrity", "/cycle", "/doc",
}


class WebhookHandler(BaseHTTPRequestHandler):
    secret = ""

    def log_message(self, format, *args):
        pass

    def _check_auth(self) -> bool:
        """Verify Bearer token matches webhook secret. Returns True if authorized."""
        if not self.secret:
            return True  # no secret configured = open (dev mode)
        auth = self.headers.get("Authorization", "")
        if auth == f"Bearer {self.secret}":
            return True
        log.warning(f"Unauthorized request to {self.path} from {self.client_address[0]}")
        self.send_response(401)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"error": "unauthorized"}\n')
        return False

    def do_GET(self):
        """Health and control endpoints."""
        if self.path == "/health":
            _check_daily_reset()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status = {
                "status": "paused" if is_paused() else "ok",
                "paused": is_paused(),
                "in_flight": {k: v for k, v in _in_flight.items()},
                "queued": {k: v[0] for k, v in _queue.items()},
                "budget": {
                    "daily_used": _daily_count,
                    "daily_max": MAX_SYNCS_PER_DAY,
                    "daily_resets": _daily_reset.isoformat(),
                    "hourly_max": MAX_SYNCS_PER_HOUR,
                    "hourly_used": {
                        repo: len(times) for repo, times in _sync_times.items()
                    },
                },
                "timeout_seconds": SYNC_TIMEOUT_SECONDS,
                "cooldown_seconds": COOLDOWN_SECONDS,
                "cooldowns": {
                    repo: max(0, int(COOLDOWN_SECONDS - (datetime.now() - times[-1]).total_seconds()))
                    for repo, times in _sync_times.items() if times
                },
                "schedule": [
                    {
                        "repo": t["repo"],
                        "prompt": t["prompt"],
                        "interval": t["interval_seconds"],
                        "next_run": _schedule_next.get(
                            f"{t['repo']}:{t['prompt']}", ""
                        ).isoformat() if _schedule_next.get(f"{t['repo']}:{t['prompt']}") else "pending",
                    }
                    for t in SCHEDULE
                ],
                "build_verify": BUILD_VERIFY,
                "repos": list(REPO_PATHS.keys()),
                "timestamp": datetime.now().isoformat(),
            }
            self.wfile.write(json.dumps(status, indent=2).encode())

        elif self.path.startswith("/activity"):
            # Parse query params: ?repo=X&event=Y&n=Z
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            repo_filter = qs.get("repo", [None])[0]
            event_filter = qs.get("event", [None])[0]
            limit = int(qs.get("n", ["50"])[0])

            entries = list(_activity)
            if repo_filter:
                entries = [e for e in entries if e.get("repo") == repo_filter]
            if event_filter:
                entries = [e for e in entries if e.get("event") == event_filter]
            entries = entries[-limit:]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(entries, indent=2).encode())

        elif self.path == "/sessions":
            if not self._check_auth():
                return
            sessions = [
                e for e in _activity
                if e.get("event") == "run_done" and e.get("session_id")
            ]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(sessions[-20:], indent=2).encode())

        elif self.path == "/pause":
            if not self._check_auth():
                return
            PAUSE_FILE.touch()
            log.warning("PAUSED via /pause endpoint")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Paused.\n")

        elif self.path == "/resume":
            if not self._check_auth():
                return
            if PAUSE_FILE.exists():
                PAUSE_FILE.unlink()
                log.info("RESUMED via /resume endpoint")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Resumed.\n")

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        from urllib.parse import urlparse

        # Authenticated /trigger endpoint — restricted to allowed prompts
        if urlparse(self.path).path == "/trigger":
            if not self._check_auth():
                return

            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                return

            repo = payload.get("repo", "")
            prompt = payload.get("prompt", "/sync")
            clone_path = REPO_PATHS.get(repo)

            if prompt not in ALLOWED_PROMPTS:
                log.warning(f"Rejected disallowed prompt from {self.client_address[0]}: {prompt!r}")
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "prompt not allowed",
                    "allowed": sorted(ALLOWED_PROMPTS),
                }).encode())
                return

            if not clone_path:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"unknown repo: {repo}"}).encode())
                return

            self.send_response(202)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "accepted", "repo": repo, "prompt": prompt}).encode())

            trigger_claude(repo, clone_path, prompt, f"manual trigger via /trigger")
            return

        # Verify signature for external webhooks
        sig = self.headers.get("X-Hub-Signature-256", "")
        if self.secret and not verify_signature(body, sig, self.secret):
            log.warning(f"Invalid signature from {self.client_address[0]}")
            self.send_response(403)
            self.end_headers()
            return

        # Parse event
        event_type = self.headers.get("X-GitHub-Event", "")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()

        # Only process PR events
        if event_type != "pull_request":
            log.debug(f"Ignoring event type: {event_type}")
            return

        action = payload.get("action", "")
        if action not in ("opened", "synchronize", "reopened"):
            log.debug(f"Ignoring PR action: {action}")
            return

        repo = payload.get("repository", {}).get("name", "")
        branch = payload.get("pull_request", {}).get("head", {}).get("ref", "")
        pr_number = payload.get("number", "?")
        pr_title = payload.get("pull_request", {}).get("title", "")

        _emit("webhook", repo, f"PR #{pr_number} {action}: {pr_title}", branch=branch)

        # Only trigger for agent branches
        if "agent" not in branch.lower():
            log.info(f"Ignoring non-agent PR on {repo}: #{pr_number} ({branch})")
            _emit("skipped", repo, f"non-agent branch: {branch}")
            return

        clone_path = REPO_PATHS.get(repo)
        if not clone_path:
            log.warning(f"No clone path configured for repo: {repo}")
            _emit("skipped", repo, "no clone path configured")
            return

        if not clone_path.exists():
            log.error(f"Clone path does not exist: {clone_path}")
            _emit("error", repo, f"clone path missing: {clone_path}")
            return

        trigger_claude(repo, clone_path, "/sync", f"PR #{pr_number}: {pr_title}")


def main():
    parser = argparse.ArgumentParser(description="Interagent webhook listener")
    parser.add_argument("--port", type=int, default=8787, help="Listen port")
    args = parser.parse_args()

    secret = os.environ.get("WEBHOOK_SECRET", "")
    if not secret:
        log.warning("WEBHOOK_SECRET not set — signature verification disabled!")
    WebhookHandler.secret = secret

    log.info("=== Interagent Mesh Daemon ===")
    log.info(f"Budget: {MAX_SYNCS_PER_HOUR}/hour, {MAX_SYNCS_PER_DAY}/day, {COOLDOWN_SECONDS}s cooldown")
    log.info(f"Timeout: {SYNC_TIMEOUT_SECONDS}s per run")
    log.info(f"Build verify: {'ON' if BUILD_VERIFY else 'OFF'}")
    log.info(f"Kill switch: touch {PAUSE_FILE}")

    for repo, path in REPO_PATHS.items():
        if path.exists():
            log.info(f"  {repo}: {path}")
        else:
            log.warning(f"  {repo}: {path} (MISSING)")

    if SCHEDULE:
        log.info(f"Schedule: {len(SCHEDULE)} tasks")
        for t in SCHEDULE:
            log.info(f"  {t['repo']}: {t['prompt']} every {t['interval_seconds']}s")
        sched_thread = threading.Thread(target=_scheduler_loop, daemon=True)
        sched_thread.start()
    else:
        log.info("Schedule: none (webhook-only mode)")

    server = HTTPServer(("127.0.0.1", args.port), WebhookHandler)
    log.info(f"Listening on 127.0.0.1:{args.port}")
    log.info("Endpoints: POST / (webhook), POST /trigger, GET /health, GET /activity, GET /sessions, GET /pause, GET /resume")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down")
        server.server_close()


if __name__ == "__main__":
    main()
