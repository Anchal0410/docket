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
| 3 | DLQ endpoints + PENDING promoter (priority queues and delayed submission shipped early, in Phase 1) | Shipped |
| 4 | Fleet-wide per-type concurrency caps, cancellation, HTTP rate limiting (worker graceful shutdown shipped early, in Phase 1) | Shipped |
| 5 | Observability — Prometheus metrics + Grafana dashboard in Compose | Shipped |
| 6 | Load testing, chaos testing, backpressure | Next |

Every Must-have from the original spec has been done since Phase 3 shipped.
Phases 3–5 added retries/DLQ polish, fleet-wide controls, and observability
on top of that baseline.

## Status

Phases 0–5 are shipped and verified end to end, not just written.

- 31 unit tests + 23 integration tests (real Postgres via Testcontainers)
  passing
- Demo 2 (chaos): 240 jobs submitted, 2 of 4 workers `docker kill`ed
  mid-batch, the broker's recovery loop reclaimed the 4 stranded jobs, all
  240 completed — zero lost
- Full stack verified live through `docker compose up`: postgres → migrate
  → broker → worker → prometheus → grafana, including a real job submitted
  end-to-end and its metrics/dashboard confirmed updating
- Integration testing against a real Postgres (only possible once Docker
  was available mid-session) caught three real concurrency bugs in
  `claim()`'s per-type limiting that the build and mocked unit tests could
  not — see the Phase 5 commit for details. A reminder that "builds and
  unit tests pass" is not the same claim as "verified," for exactly the
  SKIP LOCKED-adjacent code this project exists to get right.

Repo: [github.com/Anchal0410/docket](https://github.com/Anchal0410/docket)
(public), 10 commits on `main`, CI green.

## Next steps

Phase 6 scope (not yet started): load testing, chaos testing, backpressure.
No concrete task breakdown yet — TBD when this phase is picked up.
