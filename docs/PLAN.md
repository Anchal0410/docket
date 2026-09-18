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
| 3 | DLQ endpoints + PENDING promoter (priority queues and delayed submission shipped early, in Phase 1) | Next |
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

Repo: [github.com/Anchal0410/docket](https://github.com/Anchal0410/docket)
(public), 4 commits on `main`, CI green.

## Next steps

Phase 3 scope:

- [ ] `PENDING → QUEUED` promoter — a scheduler tick that activates delayed
      jobs once `run_at` arrives (submission-time delay already works;
      nothing currently promotes them out of `PENDING`)
- [ ] `GET /dead-letter-jobs` — list jobs in `DEAD_LETTER`, paginated
- [ ] `POST /dead-letter-jobs/:id/retry` — reset a dead-lettered job back to
      `QUEUED` (resets `attempts` to 0, giving it a fresh run)

Already shipped ahead of schedule, in Phase 1: priority queues
(`JobPriority` 0/1/2, `claim`'s `ORDER BY priority DESC`) and delayed
submission (`runAt`/`delay` at submit time, stored as `PENDING` until due).
