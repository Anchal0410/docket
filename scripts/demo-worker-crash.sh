#!/usr/bin/env bash
# Demo 2 — kill workers mid-batch, prove no jobs are lost.
#
#   JOBS=60 KILL=2 ./scripts/demo-worker-crash.sh
#
# Wipes the local volume for a clean count, brings up 4 workers, submits JOBS
# jobs, kills KILL of them a few seconds in, and waits for every job to reach
# COMPLETED.
set -euo pipefail
cd "$(dirname "$0")/.."

JOBS="${JOBS:-60}"
KILL="${KILL:-2}"
BROKER="${BROKER:-http://localhost:4400}"
COMPOSE="docker compose"

count() {
    $COMPOSE exec -T postgres psql -U docket -d docket -tAc "$1" | tr -d '[:space:]'
}

echo "==> fresh stack, 4 workers"
$COMPOSE down -v >/dev/null 2>&1 || true
$COMPOSE up -d --build --scale worker=4

echo "==> waiting for broker"
for _ in $(seq 1 30); do
    curl -sf "$BROKER/health" >/dev/null 2>&1 && break
    sleep 2
done

echo "==> submitting $JOBS jobs"
for i in $(seq 1 "$JOBS"); do
    curl -s -X POST "$BROKER/jobs" -H 'content-type: application/json' \
        -d "{\"type\":\"send_email\",\"payload\":{\"to\":\"u$i@example.com\"}}" \
        >/dev/null
done

sleep 3
echo "==> killing $KILL of 4 workers mid-flight"
$COMPOSE ps -q worker | head -n "$KILL" | xargs -r docker kill

echo "==> waiting for completion"
deadline=$(($(date +%s) + 180))
while :; do
    done_c=$(count "select count(*) from jobs where status='COMPLETED'")
    proc_c=$(count "select count(*) from jobs where status='PROCESSING'")
    queue_c=$(count "select count(*) from jobs where status='QUEUED'")
    echo "   completed=$done_c queued=$queue_c processing=$proc_c"
    [ "$done_c" -ge "$JOBS" ] && break
    [ "$(date +%s)" -gt "$deadline" ] && { echo "   TIMEOUT"; break; }
    sleep 3
done

completed=$(count "select count(*) from jobs where status='COMPLETED'")
not_done=$(count "select count(*) from jobs where status <> 'COMPLETED'")

echo
echo "==> $completed / $JOBS completed, $not_done not completed"
if [ "$completed" -eq "$JOBS" ] && [ "$not_done" -eq 0 ]; then
    echo "PASS — killed $KILL workers, zero jobs lost"
    exit 0
fi
echo "FAIL"
exit 1
