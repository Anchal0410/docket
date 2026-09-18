# Docket

A distributed job queue: a broker service (NestJS + Fastify + Postgres) that
accepts jobs over HTTP and hands them to a fleet of workers that register
their capabilities, claim work, and report back.

Build plan through Phase 3: submit jobs (with priority and delayed/scheduled
run times), register workers, claim/ack/fail with a visibility-timeout
lease, retries with exponential backoff, a dead-letter state with a browse
and manual-retry API, heartbeats, and automatic recovery of jobs abandoned
by workers that crash.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the stack/structure
decisions and core mechanisms, and [docs/PLAN.md](docs/PLAN.md) for the
phase-by-phase build plan and current status.

## Quickstart

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm start:dev            # broker on :4400
pnpm start:worker         # a worker, in another terminal
```

```bash
# submit a job
curl -X POST http://localhost:4400/jobs \
  -H "content-type: application/json" \
  -d '{"type":"send_email","payload":{"to":"user@example.com"}}'

# the worker claims, runs, and acks it — then:
curl http://localhost:4400/jobs/<id-from-above>   # -> status COMPLETED, with result
```

API docs at `/docs` when `SWAGGER_ENABLED=true`. Health check at `/health`.

## Docker Compose

```bash
docker compose up --build           # postgres + migrate + broker + a worker
docker compose up -d --scale worker=4
./scripts/demo-worker-crash.sh      # kill 2 of 4 workers mid-batch — zero jobs lost
```

`docker kill`ed workers stay down (Docker suppresses the restart policy on an
external kill); the recovery loop reclaims their jobs anyway. Bring the fleet
back with `docker compose up -d --scale worker=4`.

## Commands

```bash
pnpm start:dev        # broker, watch mode
pnpm start:worker     # worker (env vars or --id= --capabilities= --concurrency= --broker=)
pnpm build            # compile broker + worker to dist/
pnpm test             # jest — unit tests (mock the ports)
pnpm test:int         # jest — integration tests (real Postgres via Testcontainers)
pnpm db:migrate       # prisma migrate dev (local)
pnpm db:generate      # regenerate Prisma client after schema changes
```

## API

| Endpoint | Caller | Purpose |
|---|---|---|
| `POST /jobs` | producer | submit a job |
| `GET /jobs/:id` | producer | job status, attempts, result |
| `POST /workers/register` | worker | register (idempotent on `workerId`) |
| `POST /workers/:id/heartbeat` | worker | liveness ping (~every 5s) |
| `DELETE /workers/:id` | worker | deregister |
| `POST /jobs/claim` | worker | claim a batch of due jobs matching the worker's capabilities |
| `POST /jobs/:id/ack` | worker | mark completed, store result |
| `POST /jobs/:id/fail` | worker | retry with backoff, or dead-letter at `maxAttempts` |
| `POST /jobs/:id/lease/renew` | worker | extend the lease for a long-running handler |
| `GET /dead-letter-jobs` | operator | list dead-lettered jobs, paginated |
| `POST /dead-letter-jobs/:id/retry` | operator | requeue a dead-lettered job with attempts reset |

## Worker-failure recovery

A worker heartbeats every ~5s. A recovery loop on the broker (every
`QUEUE_RECOVERY_INTERVAL_MS`) does three things in order:

1. mark workers silent longer than `QUEUE_DEAD_WORKER_THRESHOLD_SECONDS` as `DEAD`
2. requeue those workers' in-flight jobs immediately
3. requeue any job whose lease expired regardless of worker status — the
   safety net for a worker that heartbeats fine but hangs on one job

Both (2) and (3) exist on purpose: heartbeat detection is fast but
whole-worker; lease expiry is slower but per-job and catches everything.

## Architecture

Hexagonal (ports & adapters) per module, mirroring the layout below for every
bounded context under `src/modules/` (`jobs`, `workers`):

```
src/modules/<name>/
  domain/
    value-objects/  ← immutable domain shapes
    ports/          ← repository interfaces (Symbol tokens, no NestJS deps)
  application/
    commands/       ← command objects + handlers (state-changing)
    queries/        ← query objects + handlers (read-only)
  infrastructure/
    repositories/   ← Prisma adapter implementations of domain ports
  http/
    *.controller.ts ← thin: parse DTO → call handler → map to response DTO
    *.dto.ts
```

No CQRS bus — handlers are plain `@Injectable()` classes injected directly
into controllers. The `SKIP LOCKED` claim and the lease guards are raw SQL
(`$queryRaw` / guarded `updateMany`) in the repository adapter.

The worker (`worker/`) is a standalone plain-TS program (no NestJS), run via
`tsx` in dev and compiled to `dist/worker/` for the image.

## Job lifecycle

```
PENDING ──run_at──▶ QUEUED ──claim──▶ PROCESSING ──ack──▶ COMPLETED
                      ▲                    │
                      └── fail (backoff) ──┤
                      │                    └── fail @ maxAttempts ──▶ DEAD_LETTER
                      └──────────────── retry (attempts reset) ───────────┘
```

A `PENDING` job is promoted to `QUEUED` by a scheduler tick (`QUEUE_PROMOTION_INTERVAL_MS`)
once its `run_at` arrives — claim only ever looks at `QUEUED`.

Delivery is **at-least-once**: a worker can finish the work and die before its
ack lands, so the job runs again. Make handlers idempotent.
