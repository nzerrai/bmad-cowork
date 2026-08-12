#!/usr/bin/env bash
# Rebuilds and restarts the local BMad Portal dev stack: Postgres (docker
# compose), Backend (uvicorn --reload), IHM (Next.js dev server), and the
# VS Code extension (recompiled -- reload the Extension Development Host
# window in VS Code afterwards to pick it up; a shell script can't do that
# part for you).
#
# Usage:
#   scripts/dev-restart.sh          # stop, rebuild, restart everything
#   scripts/dev-restart.sh stop     # stop the backend + IHM only
#
# Logs and PID files land in .dev/ (gitignored). Ports come from
# BACKEND_PORT/IHM_PORT env vars, defaulting to 8000/4000 to match
# .env.example / ihm/package.json.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/.dev"
mkdir -p "$DEV_DIR"

BACKEND_PORT="${BACKEND_PORT:-8000}"
IHM_PORT="${IHM_PORT:-4000}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$1" >&2; }

# Kills whatever is bound to $1, plus any process matching the pgrep
# pattern $2 (uvicorn's --reload watcher isn't always the process holding
# the socket, so port-kill alone can leave it running).
stop_service() {
	local port="$1" pattern="$2" pids

	pids=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
	if [[ -n "$pids" ]]; then
		log "Stopping process(es) on port ${port}: ${pids}"
		kill $pids 2>/dev/null || true
		sleep 1
		pids=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
		[[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
	fi

	pids=$(pgrep -f "$pattern" 2>/dev/null || true)
	[[ -n "$pids" ]] && kill $pids 2>/dev/null || true
}

stop_all() {
	log "Stopping backend (:${BACKEND_PORT})"
	stop_service "$BACKEND_PORT" "uvicorn app.main:app"
	log "Stopping IHM (:${IHM_PORT})"
	stop_service "$IHM_PORT" "next dev --port ${IHM_PORT}"
}

if [[ "${1:-}" == "stop" ]]; then
	stop_all
	log "Stopped."
	exit 0
fi

stop_all

log "Ensuring Postgres is up"
if docker ps --filter "name=^/bmad-portal-postgres$" --filter "status=running" --format '{{.Names}}' 2>/dev/null | grep -q .; then
	log "Postgres container already running, leaving it as-is"
elif ! (cd "$ROOT_DIR" && docker compose up -d postgres); then
	warn "docker compose failed -- is Docker running? Aborting."
	exit 1
fi

log "Applying backend migrations"
if ! (cd "$ROOT_DIR/backend" && uv run python -m alembic upgrade head); then
	warn "Alembic migration failed. Aborting before starting the backend."
	exit 1
fi

log "Starting backend (uvicorn --reload) on :${BACKEND_PORT}"
(
	cd "$ROOT_DIR/backend"
	nohup uv run python -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" \
		>"$DEV_DIR/backend.log" 2>&1 &
	echo $! >"$DEV_DIR/backend.pid"
)

log "Starting IHM (next dev) on :${IHM_PORT}"
(
	cd "$ROOT_DIR/ihm"
	nohup npm run dev >"$DEV_DIR/ihm.log" 2>&1 &
	echo $! >"$DEV_DIR/ihm.pid"
)

log "Recompiling VS Code extension"
if ! (cd "$ROOT_DIR/vscode-extension" && npm run compile && npm run bundle); then
	warn "VS Code extension compile/bundle failed -- check the output above."
fi

log "Waiting for backend health check"
backend_up=false
for _ in $(seq 1 30); do
	if curl -sf "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
		backend_up=true
		break
	fi
	sleep 0.5
done
if [[ "$backend_up" == true ]]; then
	log "Backend up: http://localhost:${BACKEND_PORT} (logs: $DEV_DIR/backend.log)"
else
	warn "Backend did not answer /health in time -- check $DEV_DIR/backend.log"
fi

log "IHM starting in background: http://localhost:${IHM_PORT} (logs: $DEV_DIR/ihm.log)"
log "VS Code extension recompiled -- run 'Developer: Reload Window' in the Extension Development Host to pick it up."
log "Done."
