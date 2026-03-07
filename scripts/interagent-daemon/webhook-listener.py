#!/usr/bin/env python3
"""
Interagent mesh webhook listener.

Receives GitHub PR webhooks and triggers `claude -p "/sync"` in the
appropriate repo when an agent opens or updates a PR.

Safety guardrails:
  - Per-repo in-flight dedup (no parallel syncs on same repo)
  - Rate limit: max N syncs per hour per repo (default 6)
  - Daily budget: max N total syncs per day (default 30)
  - Process timeout: kills claude after N minutes (default 10)
  - Kill switch: touch ~/INTERAGENT_PAUSE to pause all syncs
  - Health endpoint: GET /health shows budget, in-flight, pause status

Usage:
    WEBHOOK_SECRET=xxx python3 webhook-listener.py [--port 8787]

Pair with cloudflared:
    cloudflared tunnel --url http://localhost:8787
"""

import argparse
import hashlib
import hmac
import json
import logging
import os
import signal
import subprocess
import threading
from collections import defaultdict
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
SYNC_TIMEOUT_SECONDS = int(os.environ.get("SYNC_TIMEOUT_SECONDS", "600"))  # 10 min
PAUSE_FILE = Path.home() / "INTERAGENT_PAUSE"

# --- State tracking ---

_in_flight: dict[str, int] = {}  # repo -> PID
_sync_times: defaultdict[str, list[datetime]] = defaultdict(list)  # repo -> [timestamps]
_daily_count = 0
_daily_reset = datetime.now().replace(hour=0, minute=0, second=0) + timedelta(days=1)
_lock = threading.Lock()


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

    return None


def verify_signature(body: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


def trigger_sync(repo: str, clone_path: Path, pr_info: str):
    """Run claude -p '/sync' in the repo's working directory."""
    global _daily_count

    with _lock:
        reason = check_budget(repo)
        if reason:
            log.warning(f"Blocked sync for {repo}: {reason}")
            return

    log.info(f"Triggering sync for {repo}: {pr_info}")

    sync_log = LOG_DIR / f"{repo}-sync-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"

    try:
        proc = subprocess.Popen(
            [
                "claude", "-p", "/sync",
                "--allowedTools", "Read,Edit,Write,Bash,Glob,Grep",
                "--no-input",
                "--output-format", "text",
            ],
            cwd=str(clone_path),
            stdout=open(sync_log, "w"),
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
            f"Started claude PID {proc.pid}, logging to {sync_log} "
            f"(daily {_daily_count}/{MAX_SYNCS_PER_DAY}, "
            f"hourly {len(_sync_times[repo])}/{MAX_SYNCS_PER_HOUR})"
        )

        def wait_and_cleanup():
            try:
                rc = proc.wait(timeout=SYNC_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired:
                log.error(
                    f"TIMEOUT: sync for {repo} exceeded {SYNC_TIMEOUT_SECONDS}s, "
                    f"killing PID {proc.pid}"
                )
                proc.kill()
                proc.wait()
                rc = -9

            with _lock:
                _in_flight.pop(repo, None)

            status = "OK" if rc == 0 else f"FAILED (exit {rc})"
            log.info(f"Sync for {repo} finished: {status}, log: {sync_log}")

        threading.Thread(target=wait_and_cleanup, daemon=True).start()

    except Exception as e:
        with _lock:
            _in_flight.pop(repo, None)
        log.error(f"Failed to start sync for {repo}: {e}")


class WebhookHandler(BaseHTTPRequestHandler):
    secret = ""

    def log_message(self, format, *args):
        pass

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
                "pause_file": str(PAUSE_FILE),
                "in_flight": {k: v for k, v in _in_flight.items()},
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
                "repos": {k: str(v) for k, v in REPO_PATHS.items()},
                "timestamp": datetime.now().isoformat(),
            }
            self.wfile.write(json.dumps(status, indent=2).encode())

        elif self.path == "/pause":
            PAUSE_FILE.touch()
            log.warning("PAUSED via /pause endpoint")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Paused. Remove ~/INTERAGENT_PAUSE to resume.\n")

        elif self.path == "/resume":
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

        # Verify signature
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

        # Only trigger for agent branches
        if "agent" not in branch.lower():
            log.info(f"Ignoring non-agent PR on {repo}: #{pr_number} ({branch})")
            return

        clone_path = REPO_PATHS.get(repo)
        if not clone_path:
            log.warning(f"No clone path configured for repo: {repo}")
            return

        if not clone_path.exists():
            log.error(f"Clone path does not exist: {clone_path}")
            return

        trigger_sync(repo, clone_path, f"PR #{pr_number}: {pr_title}")


def main():
    parser = argparse.ArgumentParser(description="Interagent webhook listener")
    parser.add_argument("--port", type=int, default=8787, help="Listen port")
    args = parser.parse_args()

    secret = os.environ.get("WEBHOOK_SECRET", "")
    if not secret:
        log.warning("WEBHOOK_SECRET not set — signature verification disabled!")
    WebhookHandler.secret = secret

    log.info("=== Interagent Webhook Listener ===")
    log.info(f"Budget: {MAX_SYNCS_PER_HOUR}/hour, {MAX_SYNCS_PER_DAY}/day")
    log.info(f"Timeout: {SYNC_TIMEOUT_SECONDS}s per sync")
    log.info(f"Kill switch: touch {PAUSE_FILE}")

    for repo, path in REPO_PATHS.items():
        if path.exists():
            log.info(f"  {repo}: {path}")
        else:
            log.warning(f"  {repo}: {path} (MISSING)")

    server = HTTPServer(("127.0.0.1", args.port), WebhookHandler)
    log.info(f"Listening on 127.0.0.1:{args.port}")
    log.info("Endpoints: POST / (webhook), GET /health, GET /pause, GET /resume")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down")
        server.server_close()


if __name__ == "__main__":
    main()
