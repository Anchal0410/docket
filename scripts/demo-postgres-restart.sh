#!/usr/bin/env bash
# Demo 3 — restart Postgres mid-flight, prove the broker survives a
# transient DB outage (doesn't crash) and every job still drains to
# COMPLETED once it's back, via the same recovery mechanisms that handle
# a dead worker.
#
#   JOBS=60 ./scripts/demo-postgres-restart.sh
set -euo pipefail
cd "$(dirname "$0")/.."

JOBS="${JOBS:-60}"
BROKER="${BROKER:-http://localhost:4400}"
COMPOSE="docker compose"

count() {
    $COMPOSE exec -T postgres psql -U docket -d docket -tAc "$1" | tr -d '[:space:]'
}

echo "==> fresh stack, 2 workers"
$COMPOSE down -v >/dev/null 2>&1 || true
$COMPOSE up -d --build --scale worker=2

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
echo "==> restarting postgres mid-flight"
$COMPOSE restart postgres

echo "==> confirming the broker never went down and health recovers"
recovered=0
for _ in $(seq 1 40); do
    if curl -sf "$BROKER/health" >/dev/null 2>&1; then
        recovered=1
        break
    fi
    sleep 2
done
broker_cid=$($COMPOSE ps -q broker)
broker_running=$(docker inspect -f '{{.State.Running}}' "$broker_cid")
echo "   broker container running: $broker_running, health recovered: $recovered"

echo "==> waiting for all jobs to complete despite the interruption"
deadline=$(($(date +%s) + 180))
while :; do
    done_c=$(count "select count(*) from jobs where status='COMPLETED'")
    echo "   completed=$done_c"
    [ "$done_c" -ge "$JOBS" ] && break
    [ "$(date +%s)" -gt "$deadline" ] && { echo "   TIMEOUT"; break; }
    sleep 3
done

completed=$(count "select count(*) from jobs where status='COMPLETED'")
echo
echo "==> $completed / $JOBS completed after a mid-flight Postgres restart"
if [ "$broker_running" = "true" ] && [ "$recovered" -eq 1 ] && [ "$completed" -eq "$JOBS" ]; then
    echo "PASS — broker survived the DB outage without crashing or losing work"
    exit 0
fi
echo "FAIL"
exit 1
