#!/bin/bash
# Setup script for the interagent webhook listener.
#
# Prerequisites:
#   - cloudflared (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
#   - claude CLI (https://docs.anthropic.com/en/docs/claude-code)
#   - gh CLI (https://cli.github.com/)
#   - python3 >= 3.10
#   - ANTHROPIC_API_KEY set in environment
#
# What this script does:
#   1. Generates a webhook secret
#   2. Installs the systemd user service
#   3. Starts the listener
#   4. Starts a cloudflared quick tunnel
#   5. Prints the webhook URL to configure in GitHub
#
# After running, configure GitHub webhooks on:
#   - safety-quotient-lab/unratified
#   - safety-quotient-lab/psychology-agent
#   - safety-quotient-lab/observatory
# Event: Pull requests only. Secret: from step 1.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$HOME/.config/interagent"
LOG_DIR="$HOME/logs"

echo "=== Interagent Webhook Listener Setup ==="
echo

# Check prerequisites
for cmd in python3 claude gh cloudflared; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: $cmd not found. Install it first."
        exit 1
    fi
done

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "WARNING: ANTHROPIC_API_KEY not set. claude -p will fail without it."
fi

# Create config directory
mkdir -p "$CONFIG_DIR" "$LOG_DIR"

# Generate webhook secret if not exists
SECRET_FILE="$CONFIG_DIR/webhook-secret"
if [ ! -f "$SECRET_FILE" ]; then
    python3 -c "import secrets; print(secrets.token_hex(32))" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
    echo "Generated webhook secret: $SECRET_FILE"
else
    echo "Webhook secret already exists: $SECRET_FILE"
fi

# Write env file for systemd
ENV_FILE="$CONFIG_DIR/env"
cat > "$ENV_FILE" <<EOF
WEBHOOK_SECRET=$(cat "$SECRET_FILE")
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
PATH=$HOME/.config/nvm/versions/node/v24.2.0/bin:/usr/local/bin:/usr/bin:/bin
EOF
chmod 600 "$ENV_FILE"
echo "Environment file: $ENV_FILE"

# Install systemd user service
SYSTEMD_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_DIR"
cp "$SCRIPT_DIR/interagent-webhook.service" "$SYSTEMD_DIR/"

# Fix the EnvironmentFile path (systemd user units don't expand %h in EnvironmentFile)
sed -i "s|%h|$HOME|g" "$SYSTEMD_DIR/interagent-webhook.service"

systemctl --user daemon-reload
systemctl --user enable interagent-webhook.service
systemctl --user start interagent-webhook.service

echo
echo "Service started. Check status:"
echo "  systemctl --user status interagent-webhook"
echo "  journalctl --user -u interagent-webhook -f"
echo

# Health check
sleep 2
if curl -s http://localhost:8787/health | python3 -m json.tool; then
    echo
    echo "Listener is healthy."
else
    echo
    echo "WARNING: Health check failed. Check logs:"
    echo "  journalctl --user -u interagent-webhook --no-pager -n 20"
fi

echo
echo "=== Next Steps ==="
echo
echo "1. Start cloudflared tunnel (in a separate terminal or as a service):"
echo "   cloudflared tunnel --url http://localhost:8787"
echo
echo "2. Copy the tunnel URL (*.trycloudflare.com) and configure GitHub webhooks:"
echo "   - Repos: unratified, psychology-agent, observatory"
echo "   - URL: https://<tunnel-url>/webhook"
echo "   - Content type: application/json"
echo "   - Secret: $(cat "$SECRET_FILE")"
echo "   - Events: Pull requests only"
echo
echo "3. For a persistent tunnel (survives restarts), authenticate cloudflared:"
echo "   cloudflared login"
echo "   cloudflared tunnel create interagent"
echo "   # Then configure DNS: interagent.unratified.org -> tunnel"
echo
echo "4. Test with:"
echo "   curl -s http://localhost:8787/health | python3 -m json.tool"
