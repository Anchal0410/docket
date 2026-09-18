# Docket — Build Plan

_As of 2026-09-18_

See [ARCHITECTURE.md](ARCHITECTURE.md) for the decisions and mechanisms
behind this plan.

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Foundation — schema, submit/get, health, Swagger, Compose | Shipped |
| 1 | Core queue — claim/ack/fail, lease, backoff, dead-letter, worker CLI | Shipped |
| 2 | Fleet — heartbeat, dead-worker recovery, lease renewal | Shipped |
| 3 | DLQ endpoints, delayed/scheduled jobs, priority queues | Next |
| 4 | Concurrency limits, rate limiting, cancellation, graceful shutdown | Planned |
| 5 | Observability — metrics, structured logs, dashboard | Planned |
| 6 | Load testing, chaos testing, backpressure | Planned |

Phase 3 is the checkpoint: every Must-have from the original spec is done
once it ships.

## Status

Phases 0–2 are shipped and verified end to end, not just written.

- 24 unit tests + 14 integration tests (real Postgres via Testcontainers)
  passing
- Demo 2 (chaos): 240 jobs submitted, 2 of 4 workers `docker kill`ed
  mid-batch, the broker's recovery loop reclaimed the 4 stranded jobs, all
  240 completed — zero lost
- Full stack verified through `docker compose up`: postgres → migrate →
  broker → worker

Repo: `d:\docket`, git initialized, zero commits, nothing pushed.

## Next steps

Phase 3 scope:

- [ ] `GET /dead-letter-jobs` and `POST /dead-letter-jobs/:id/retry`
- [ ] Delayed/scheduled jobs — a scheduler promoting PENDING → QUEUED at
      `run_at`
- [ ] Priority queues (HIGH/MEDIUM/LOW)

Open items: first git commit and a GitHub repo (public vs. private) still
need a decision.
