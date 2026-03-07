#!/usr/bin/env bash
set -a
source "$HOME/.config/interagent/env"
set +a
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
exec /usr/bin/python3 "$HOME/projects/unratified/scripts/interagent-daemon/webhook-listener.py" --port 8787
