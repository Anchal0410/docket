#!/usr/bin/env sh
# Colocates the broker and one worker in a single process, for hosting the
# public demo on a free tier that only offers one free instance type (no
# separate free background-worker service, e.g. Render). This is a
# hosting compromise for the free demo, not the real architecture -- see
# docker-compose.yml for the genuine separate broker/worker processes,
# which is what actually demonstrates the distributed design.
set -e

export BROKER_URL="http://localhost:${PORT:-4400}"
export WORKER_ID="${WORKER_ID:-demo-worker}"
export WORKER_CAPABILITIES="${WORKER_CAPABILITIES:-send_email,generate_report}"

node dist/src/main.js &
BROKER_PID=$!

# Give the broker a moment to start listening before the worker's first
# register call, so it isn't just burning its retry budget on cold start.
sleep 3
node dist/worker/src/main.js &
WORKER_PID=$!

trap 'kill -TERM "$BROKER_PID" "$WORKER_PID" 2>/dev/null' TERM INT

wait "$BROKER_PID" "$WORKER_PID"
