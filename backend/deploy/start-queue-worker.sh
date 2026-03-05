#!/bin/bash
# Start Evimeria Laravel queue worker (statement parsing, etc.).
# Run manually: bash backend/deploy/start-queue-worker.sh
# Or from crontab @reboot: @reboot /home/royalce1/laravel-app/evimeria/backend/deploy/start-queue-worker.sh
# Replace /home/royalce1 with your $HOME (run echo $HOME on the server).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$BACKEND_DIR/storage/logs/queue-worker.log"
PID_FILE="$BACKEND_DIR/storage/logs/queue-worker.pid"

cd "$BACKEND_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Optional: stop existing worker to avoid duplicates (remove if you want multiple workers)
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Queue worker already running (PID $OLD_PID). Stop it with: kill $OLD_PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# Start worker (nohup so it survives logout when run from cron)
nohup php artisan queue:work --sleep=3 --tries=3 >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Queue worker started (PID $(cat "$PID_FILE")). Logs: $LOG_FILE"
