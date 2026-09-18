import { Injectable } from "@nestjs/common";

import { Prisma, type Job } from "#db";
import { AppError } from "#common/errors/index.js";
import { PrismaAdapter } from "#infra/database/adapters/prisma.adapter.js";

import {
    type ClaimJobsInput,
    type FailJobInput,
    type IJobRepository,
    type SubmitJobInput,
} from "../../domain/ports/job.repository.port.js";
import { backoffDelaySeconds } from "../../domain/value-objects/backoff.vo.js";
import type {
    JobPriority,
    JobStatus,
    JobVO,
} from "../../domain/value-objects/job.vo.js";

const LEASE_GUARD_FAILED =
    "Job is not currently leased by this worker — its lease may have expired.";

// Shape of a raw `jobs` row (snake_case columns) returned by $queryRaw.
interface JobRow {
    id: string;
    idempotency_key: string | null;
    type: string;
    payload: unknown;
    priority: number;
    status: string;
    run_at: Date;
    attempts: number;
    max_attempts: number;
    last_error: string | null;
    result: unknown;
    created_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
}

@Injectable()
export class PrismaJobRepository implements IJobRepository {
    constructor(private readonly prisma: PrismaAdapter) {}

    async submit(input: SubmitJobInput): Promise<JobVO> {
        const data = {
            id: input.id,
            type: input.type,
            payload: input.payload as Prisma.InputJsonValue,
            priority: input.priority,
            runAt: input.runAt,
            maxAttempts: input.maxAttempts,
            // A job whose run time has already arrived skips PENDING
            // entirely — e.g. id 1, runAt now -> "QUEUED"; id 2, runAt +1h -> "PENDING".
            status: this.isDue(input.runAt) ? "QUEUED" : "PENDING",
        } satisfies Prisma.JobUncheckedCreateInput;

        const row = input.idempotencyKey
            ? await this.prisma.job.upsert({
                  where: { idempotencyKey: input.idempotencyKey },
                  create: { ...data, idempotencyKey: input.idempotencyKey },
                  update: {},
              })
            : await this.prisma.job.create({ data });

        return this.toDomain(row);
    }

    async findById(id: string): Promise<JobVO | null> {
        const row = await this.prisma.job.findUnique({ where: { id } });
        return row ? this.toDomain(row) : null;
    }

    async claim(input: ClaimJobsInput): Promise<JobVO[]> {
        const { workerId, capabilities, batchSize, leaseSeconds } = input;

        const rows = await this.prisma.$queryRaw<JobRow[]>(Prisma.sql`
            UPDATE jobs SET
                status = 'PROCESSING',
                locked_by = ${workerId},
                lease_expires_at = now() + make_interval(secs => ${leaseSeconds}::int),
                attempts = attempts + 1,
                started_at = COALESCE(started_at, now()),
                updated_at = now()
            WHERE id IN (
                SELECT id FROM jobs
                WHERE status = 'QUEUED'
                  AND run_at <= now()
                  AND type = ANY(${capabilities}::text[])
                ORDER BY priority DESC, run_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT ${batchSize}
            )
            RETURNING *;
        `);

        return rows.map((r) => this.rawToDomain(r));
    }

    async ack(
        jobId: string,
        workerId: string,
        result: Record<string, unknown> | null,
    ): Promise<JobVO> {
        const updated = await this.prisma.job.updateMany({
            where: { id: jobId, lockedBy: workerId, status: "PROCESSING" },
            data: {
                status: "COMPLETED",
                result:
                    result === null
                        ? Prisma.DbNull
                        : (result as Prisma.InputJsonValue),
                completedAt: new Date(),
                lockedBy: null,
                leaseExpiresAt: null,
            },
        });

        if (updated.count === 0) throw AppError.conflict(LEASE_GUARD_FAILED);

        return this.toDomain(
            await this.prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
        );
    }

    async fail(input: FailJobInput): Promise<JobVO> {
        const { jobId, workerId, error, backoff } = input;

        const job = await this.prisma.job.findUnique({ where: { id: jobId } });
        if (!job || job.lockedBy !== workerId || job.status !== "PROCESSING") {
            throw AppError.conflict(LEASE_GUARD_FAILED);
        }

        const toDeadLetter = job.attempts >= job.maxAttempts;
        const data: Prisma.JobUncheckedUpdateManyInput = toDeadLetter
            ? {
                  status: "DEAD_LETTER",
                  lastError: error,
                  lockedBy: null,
                  leaseExpiresAt: null,
              }
            : {
                  status: "QUEUED",
                  lastError: error,
                  runAt: new Date(
                      Date.now() +
                          backoffDelaySeconds(job.attempts, backoff) * 1000,
                  ),
                  lockedBy: null,
                  leaseExpiresAt: null,
              };

        const updated = await this.prisma.job.updateMany({
            where: { id: jobId, lockedBy: workerId, status: "PROCESSING" },
            data,
        });
        if (updated.count === 0) throw AppError.conflict(LEASE_GUARD_FAILED);

        return this.toDomain(
            await this.prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
        );
    }

    async renewLease(
        jobId: string,
        workerId: string,
        leaseSeconds: number,
    ): Promise<JobVO> {
        const rows = await this.prisma.$queryRaw<JobRow[]>(Prisma.sql`
            UPDATE jobs SET
                lease_expires_at = now() + make_interval(secs => ${leaseSeconds}::int),
                updated_at = now()
            WHERE id = ${jobId}::uuid
              AND locked_by = ${workerId}
              AND status = 'PROCESSING'
            RETURNING *;
        `);
        if (rows.length === 0) throw AppError.conflict(LEASE_GUARD_FAILED);
        return this.rawToDomain(rows[0]);
    }

    async reclaimFromDeadWorkers(deadWorkerIds: string[]): Promise<number> {
        if (deadWorkerIds.length === 0) return 0;
        const { count } = await this.prisma.job.updateMany({
            where: { status: "PROCESSING", lockedBy: { in: deadWorkerIds } },
            data: { status: "QUEUED", lockedBy: null, leaseExpiresAt: null },
        });
        return count;
    }

    async reclaimExpiredLeases(): Promise<number> {
        // now() is the DB clock, not the broker node's — same rule as every
        // other time comparison in this schema.
        return this.prisma.$executeRaw(Prisma.sql`
            UPDATE jobs SET
                status = 'QUEUED', locked_by = NULL,
                lease_expires_at = NULL, updated_at = now()
            WHERE status = 'PROCESSING' AND lease_expires_at < now();
        `);
    }

    private isDue(runAt: Date): boolean {
        return runAt.getTime() <= Date.now();
    }

    private toDomain(row: Job): JobVO {
        return {
            id: row.id,
            idempotencyKey: row.idempotencyKey,
            type: row.type,
            payload: row.payload as Record<string, unknown>,
            priority: row.priority as JobPriority,
            status: row.status as JobStatus,
            runAt: row.runAt,
            attempts: row.attempts,
            maxAttempts: row.maxAttempts,
            lastError: row.lastError,
            result: row.result as Record<string, unknown> | null,
            createdAt: row.createdAt,
            startedAt: row.startedAt,
            completedAt: row.completedAt,
        };
    }

    private rawToDomain(r: JobRow): JobVO {
        return {
            id: r.id,
            idempotencyKey: r.idempotency_key,
            type: r.type,
            payload: r.payload as Record<string, unknown>,
            priority: r.priority as JobPriority,
            status: r.status as JobStatus,
            runAt: r.run_at,
            attempts: r.attempts,
            maxAttempts: r.max_attempts,
            lastError: r.last_error,
            result: (r.result as Record<string, unknown> | null) ?? null,
            createdAt: r.created_at,
            startedAt: r.started_at,
            completedAt: r.completed_at,
        };
    }
}
