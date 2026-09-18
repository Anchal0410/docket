#!/usr/bin/env bash
# Load test — submit a large batch concurrently, measure submission and
# end-to-end drain throughput. Uses docker-compose.load-test.yml to raise
# the HTTP rate limit for this run, so the numbers reflect actual
# submission/processing throughput rather than the rate limiter (which is
# already covered by its own unit test, and correct/expected behavior at
# its default of 100/min). Still reports 429s and 503s (backpressure,
# QUEUE_MAX_BACKLOG_DEPTH) separately if either fires.
#
#   JOBS=5000 CONCURRENCY=50 WORKERS=4 ./scripts/load-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."

JOBS="${JOBS:-2000}"
CONCURRENCY="${CONCURRENCY:-50}"
WORKERS="${WORKERS:-4}"
BROKER="${BROKER:-http://localhost:4400}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.load-test.yml"

count() {
    $COMPOSE exec -T postgres psql -U docket -d docket -tAc "$1" | tr -d '[:space:]'
}

submit_one() {
    local status
    status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BROKER/jobs" \
        -H 'content-type: application/json' \
        -d "{\"type\":\"send_email\",\"payload\":{\"to\":\"u$1@example.com\"}}")
    echo "$status"
}
export -f submit_one
export BROKER

echo "==> fresh stack, $WORKERS workers"
$COMPOSE down -v >/dev/null 2>&1 || true
$COMPOSE up -d --build --scale "worker=$WORKERS"

echo "==> waiting for broker"
for _ in $(seq 1 30); do
    curl -sf "$BROKER/health" >/dev/null 2>&1 && break
    sleep 2
done

echo "==> submitting $JOBS jobs, $CONCURRENCY concurrent"
start=$(date +%s)
statuses=$(seq 1 "$JOBS" | xargs -P "$CONCURRENCY" -I{} bash -c 'submit_one {}')
submit_end=$(date +%s)

accepted=$(echo "$statuses" | grep -c '^201$' || true)
rejected=$(echo "$statuses" | grep -c '^503$' || true)
rate_limited=$(echo "$statuses" | grep -c '^429$' || true)
other=$((JOBS - accepted - rejected - rate_limited))
submit_elapsed=$((submit_end - start))
[ "$submit_elapsed" -eq 0 ] && submit_elapsed=1

echo "==> submitted: $accepted accepted, $rejected backpressure-rejected (503)," \
     "$rate_limited rate-limited (429), $other other, in ${submit_elapsed}s"
echo "    (~$((accepted / submit_elapsed)) accepted/sec)"

echo "==> waiting for all accepted jobs to drain"
deadline=$(($(date +%s) + 300))
while :; do
    done_c=$(count "select count(*) from jobs where status='COMPLETED'")
    backlog_c=$(count "select count(*) from jobs where status in ('PENDING','QUEUED')")
    proc_c=$(count "select count(*) from jobs where status='PROCESSING'")
    echo "   completed=$done_c backlog=$backlog_c processing=$proc_c"
    [ "$done_c" -ge "$accepted" ] && break
    [ "$(date +%s)" -gt "$deadline" ] && { echo "   TIMEOUT"; break; }
    sleep 3
done
drain_end=$(date +%s)
total_elapsed=$((drain_end - start))
[ "$total_elapsed" -eq 0 ] && total_elapsed=1

completed=$(count "select count(*) from jobs where status='COMPLETED'")
echo
echo "==> $completed / $accepted accepted jobs completed, ${total_elapsed}s end-to-end"
echo "    (~$((completed / total_elapsed)) completed/sec sustained, $WORKERS workers)"

if [ "$completed" -eq "$accepted" ]; then
    echo "PASS"
    exit 0
fi
echo "FAIL — not all accepted jobs completed within the deadline"
exit 1
