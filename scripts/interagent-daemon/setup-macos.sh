#!/usr/bin/env bash
# Setup interagent webhook daemon on macOS (gray-box)
# Run this script ON gray-box, not remotely.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/logs"
ENV_DIR="$HOME/.config/interagent"
CLOUDFLARED_DIR="$HOME/.cloudflared"

echo "=== Interagent Webhook Daemon Setup (macOS) ==="

# --- Logs directory ---
mkdir -p "$LOG_DIR"
echo "✓ Log directory: $LOG_DIR"

# --- Environment file ---
mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_DIR/env" ]; then
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    cat > "$ENV_DIR/env" <<ENVEOF
WEBHOOK_SECRET=$SECRET
MAX_SYNCS_PER_HOUR=6
MAX_SYNCS_PER_DAY=30
SYNC_TIMEOUT_SECONDS=600
ENVEOF
    echo "✓ Generated webhook secret in $ENV_DIR/env"
    echo "  Save this secret for GitHub webhook config:"
    echo "  $SECRET"
else
    echo "✓ Env file already exists: $ENV_DIR/env"
fi

# --- Check ANTHROPIC_API_KEY ---
if ! grep -q "ANTHROPIC_API_KEY" "$ENV_DIR/env" 2>/dev/null; then
    echo ""
    echo "⚠  ANTHROPIC_API_KEY not set in $ENV_DIR/env"
    echo "   Add it manually:"
    echo "   echo 'ANTHROPIC_API_KEY=sk-ant-...' >> $ENV_DIR/env"
    echo ""
fi

# --- Patch plist to source env file ---
# The webhook listener reads env vars, so we inject them via launchd
# We'll create a wrapper script that sources the env file
cat > "$SCRIPT_DIR/run-webhook.sh" <<'RUNEOF'
#!/usr/bin/env bash
set -a
source "$HOME/.config/interagent/env"
set +a
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
exec /usr/bin/python3 "$HOME/projects/unratified/scripts/interagent-daemon/webhook-listener.py" --port 8787
RUNEOF
chmod +x "$SCRIPT_DIR/run-webhook.sh"
echo "✓ Created run-webhook.sh wrapper"

# --- Install launchd agents ---
mkdir -p "$LAUNCH_DIR"

# Webhook listener (uses wrapper to load env)
cat > "$LAUNCH_DIR/com.unratified.interagent-webhook.plist" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.unratified.interagent-webhook</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_DIR/run-webhook.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/interagent-webhook-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/interagent-webhook-stderr.log</string>
    <key>WorkingDirectory</key>
    <string>$HOME/projects/unratified</string>
</dict>
</plist>
PLISTEOF
echo "✓ Installed webhook LaunchAgent"

# Tunnel (only install if cloudflared is configured)
if [ -f "$CLOUDFLARED_DIR/config-interagent.yml" ]; then
    cp "$SCRIPT_DIR/com.unratified.interagent-tunnel.plist" "$LAUNCH_DIR/"
    echo "✓ Installed tunnel LaunchAgent"
else
    echo "⚠  Skipping tunnel LaunchAgent — no cloudflared config yet"
    echo "   Run these steps first:"
    echo "   1. cloudflared tunnel login"
    echo "   2. cloudflared tunnel create interagent"
    echo "   3. Create $CLOUDFLARED_DIR/config-interagent.yml"
    echo "   4. cloudflared tunnel route dns interagent interagent.unratified.org"
    echo "   Then re-run this script or manually install the tunnel plist."
fi

echo ""
echo "=== Next Steps ==="
echo "1. Add ANTHROPIC_API_KEY to $ENV_DIR/env"
echo "2. Set up cloudflared tunnel (if not done):"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create interagent"
echo "   # Note the tunnel ID, then create config:"
echo "   cat > $CLOUDFLARED_DIR/config-interagent.yml <<EOF"
echo "   tunnel: <TUNNEL_ID>"
echo "   credentials-file: $CLOUDFLARED_DIR/<TUNNEL_ID>.json"
echo "   ingress:"
echo "     - hostname: interagent.unratified.org"
echo "       service: http://localhost:8787"
echo "     - service: http_status:404"
echo "   EOF"
echo "   cloudflared tunnel route dns <TUNNEL_ID> interagent.unratified.org"
echo "3. Start services:"
echo "   launchctl load ~/Library/LaunchAgents/com.unratified.interagent-webhook.plist"
echo "   launchctl load ~/Library/LaunchAgents/com.unratified.interagent-tunnel.plist"
echo "4. Configure GitHub webhook:"
echo "   URL: https://interagent.unratified.org/"
echo "   Secret: (from $ENV_DIR/env)"
echo "   Events: Pull requests"
echo "5. Verify: curl http://localhost:8787/health"
