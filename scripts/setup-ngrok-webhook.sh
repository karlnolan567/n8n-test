#!/usr/bin/env bash
# Expose local n8n (port 5678) via ngrok and configure WEBHOOK_URL for GitHub triggers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
N8N_PORT="${N8N_PORT:-5678}"
NGROK_API="http://127.0.0.1:4040/api/tunnels"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install: brew install ngrok/ngrok/ngrok"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${N8N_PORT}/" >/dev/null 2>&1; then
  echo "n8n does not appear to be running on port ${N8N_PORT}."
  echo "Start it first: cd \"$ROOT\" && docker compose up -d"
  exit 1
fi

if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok authtoken is not configured."
  echo ""
  echo "1. Sign up (free): https://dashboard.ngrok.com/signup"
  echo "2. Copy your token: https://dashboard.ngrok.com/get-started/your-authtoken"
  echo "3. Run: ngrok config add-authtoken YOUR_TOKEN"
  echo "4. Re-run this script."
  exit 1
fi

if ! curl -sf "$NGROK_API" >/dev/null 2>&1; then
  echo "Starting ngrok tunnel on port ${N8N_PORT}..."
  nohup ngrok http "$N8N_PORT" --log=stdout > "$ROOT/shared/ngrok.log" 2>&1 &
  echo "$!" > "$ROOT/shared/ngrok.pid"
  for _ in $(seq 1 20); do
    sleep 1
    curl -sf "$NGROK_API" >/dev/null 2>&1 && break
  done
fi

PUBLIC_URL="$(python3 - <<'PY'
import json, urllib.request
data = json.load(urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels"))
for t in data.get("tunnels", []):
    if t.get("proto") == "https":
        print(t["public_url"])
        break
PY
)"

if [[ -z "${PUBLIC_URL}" ]]; then
  echo "Could not read ngrok public URL. Check: tail -f \"$ROOT/shared/ngrok.log\""
  exit 1
fi

PUBLIC_URL="${PUBLIC_URL%/}/"
echo "ngrok public URL: ${PUBLIC_URL}"

touch "$ENV_FILE"
if grep -q '^WEBHOOK_URL=' "$ENV_FILE"; then
  sed -i '' "s|^WEBHOOK_URL=.*|WEBHOOK_URL=${PUBLIC_URL}|" "$ENV_FILE"
else
  echo "WEBHOOK_URL=${PUBLIC_URL}" >> "$ENV_FILE"
fi

if grep -q '^N8N_EDITOR_BASE_URL=' "$ENV_FILE"; then
  sed -i '' "s|^N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=${PUBLIC_URL}|" "$ENV_FILE"
else
  echo "N8N_EDITOR_BASE_URL=${PUBLIC_URL}" >> "$ENV_FILE"
fi

echo "Updated $ENV_FILE"
echo "Restarting n8n..."
cd "$ROOT"
docker compose up -d n8n

echo ""
echo "Done. Next steps:"
echo "  1. Open n8n: ${PUBLIC_URL}"
echo "  2. Activate workflow: 06 - Code Companion PR and Issue Triage to Notify issues"
echo "  3. Keep ngrok running (PID $(cat "$ROOT/shared/ngrok.pid" 2>/dev/null || echo 'see shared/ngrok.log'))"
echo ""
echo "ngrok inspector: http://127.0.0.1:4040"
