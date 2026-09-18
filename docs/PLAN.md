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
| 6 | Backpressure, load testing, a second chaos scenario | Shipped |

Every Must-have from the original spec has been done since Phase 3 shipped.
Phases 3–6 added retries/DLQ polish, fleet-wide controls, observability,
and load/chaos verification on top of that baseline. This closes the
originally planned 7-phase build.

## Status

Phases 0–6 are shipped and verified end to end, not just written.

- 32 unit tests + 23 integration tests (real Postgres via Testcontainers)
  passing
- Demo 2 (chaos, worker crash): 240 jobs submitted, 2 of 4 workers
  `docker kill`ed mid-batch, the recovery loop reclaimed the 4 stranded
  jobs, all 240 completed — zero lost
- Demo 3 (chaos, DB restart): 60 jobs submitted, Postgres restarted
  mid-flight, broker stayed up and health recovered without a crash, all
  60 completed — zero lost
- Load test (`scripts/load-test.sh`): 300 jobs, 30 concurrent submitters,
  4 workers — 300/300 accepted (rate limit raised for the run via
  `docker-compose.load-test.yml`), ~42 accepted/sec submission, ~25/sec
  sustained completion, drained in 12s. Backpressure (503) and the HTTP
  rate limiter (429) are tracked as distinct outcomes in the script's
  output.
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
(public), commits on `main`, CI green.

## Next steps

The originally planned 7-phase build (0–6) is complete. Nothing currently
queued — future work would be a new, deliberately scoped initiative rather
than a numbered phase (e.g. exactly-once-flavored dedup, a second broker
instance / HA, an admin UI on top of the existing DLQ + metrics APIs).
