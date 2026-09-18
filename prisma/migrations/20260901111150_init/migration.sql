-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
    "locked_by" TEXT,
    "lease_expires_at" TIMESTAMPTZ(6),
    "result" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "worker_id" TEXT NOT NULL,
    "capabilities" TEXT[],
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "current_job_count" INTEGER NOT NULL DEFAULT 0,
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("worker_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_status_priority_run_at_idx" ON "jobs"("status", "priority", "run_at");

-- CreateIndex
CREATE INDEX "jobs_locked_by_idx" ON "jobs"("locked_by");

-- CreateIndex
CREATE INDEX "workers_status_idx" ON "workers"("status");
