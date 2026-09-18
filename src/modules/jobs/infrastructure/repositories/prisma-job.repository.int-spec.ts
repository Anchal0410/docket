import { uuidv7 } from "uuidv7";

import { startTestDb, type TestDb } from "../../../../../test/support/postgres.js";
import type { PrismaAdapter } from "#infra/database/adapters/prisma.adapter.js";

import { PrismaJobRepository } from "./prisma-job.repository.js";

const lease = { workerId: "w", capabilities: ["send_email"], batchSize: 10, leaseSeconds: 30 };

describe("PrismaJobRepository.claim (integration)", () => {
    let db: TestDb;
    let repo: PrismaJobRepository;

    beforeAll(async () => {
        db = await startTestDb();
        repo = new PrismaJobRepository(db.prisma as unknown as PrismaAdapter);
    });

    afterAll(async () => {
        await db?.stop();
    });

    beforeEach(async () => {
        await db.prisma.job.deleteMany();
    });

    function seed(
        rows: Array<{ type?: string; priority?: number; runAt?: Date }>,
    ) {
        return db.prisma.job.createMany({
            data: rows.map((r) => ({
                id: uuidv7(),
                type: r.type ?? "send_email",
                payload: {},
                status: "QUEUED",
                priority: r.priority ?? 1,
                runAt: r.runAt ?? new Date(),
            })),
        });
    }

    it("hands each job to exactly one concurrent claimer", async () => {
        await seed(Array.from({ length: 50 }, () => ({})));

        const batches = await Promise.all(
            Array.from({ length: 10 }, (_, i) =>
                repo.claim({ ...lease, workerId: `w${i}`, batchSize: 10 }),
            ),
        );

        const ids = batches.flat().map((j) => j.id);
        expect(ids).toHaveLength(50);
        expect(new Set(ids).size).toBe(50);
        for (const job of batches.flat()) {
            expect(job.status).toBe("PROCESSING");
            expect(job.attempts).toBe(1);
        }
    });

    it("only claims jobs the worker is capable of", async () => {
        await seed([{ type: "send_email" }, { type: "generate_report" }]);

        const claimed = await repo.claim({ ...lease, capabilities: ["send_email"] });

        expect(claimed).toHaveLength(1);
        expect(claimed[0].type).toBe("send_email");
    });

    it("claims higher priority before lower", async () => {
        await seed([{ priority: 0 }, { priority: 2 }, { priority: 1 }]);

        const [first] = await repo.claim({ ...lease, batchSize: 1 });

        expect(first.priority).toBe(2);
    });

    it("does not claim jobs whose run_at is in the future", async () => {
        await seed([{ runAt: new Date(Date.now() + 60_000) }]);

        const claimed = await repo.claim(lease);

        expect(claimed).toHaveLength(0);
    });

    it("ack completes only for the worker holding the lease", async () => {
        await seed([{}]);
        const [job] = await repo.claim({ ...lease, workerId: "w1", batchSize: 1 });

        await expect(repo.ack(job.id, "someone-else", null)).rejects.toThrow();

        const done = await repo.ack(job.id, "w1", { ok: true });
        expect(done.status).toBe("COMPLETED");
        expect(done.result).toEqual({ ok: true });
    });

    it("fail requeues with a future run_at until maxAttempts, then dead-letters", async () => {
        await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "QUEUED",
                maxAttempts: 2,
            },
        });
        const backoff = { baseSeconds: 2, maxSeconds: 3600 };

        const [a] = await repo.claim({ ...lease, workerId: "w1", batchSize: 1 });
        const afterFirst = await repo.fail({
            jobId: a.id,
            workerId: "w1",
            error: "boom",
            backoff,
        });
        expect(afterFirst.status).toBe("QUEUED");
        expect(afterFirst.runAt.getTime()).toBeGreaterThan(Date.now());
        expect(afterFirst.lastError).toBe("boom");

        // force it claimable again, exhaust the last attempt
        await db.prisma.job.update({
            where: { id: a.id },
            data: { runAt: new Date() },
        });
        const [b] = await repo.claim({ ...lease, workerId: "w1", batchSize: 1 });
        const afterSecond = await repo.fail({
            jobId: b.id,
            workerId: "w1",
            error: "boom again",
            backoff,
        });
        expect(afterSecond.status).toBe("DEAD_LETTER");
    });

    it("renewLease extends the lease only for the holding worker", async () => {
        await seed([{}]);
        const [job] = await repo.claim({ ...lease, workerId: "w1", batchSize: 1 });
        const before = await db.prisma.job.findUniqueOrThrow({
            where: { id: job.id },
        });

        await expect(repo.renewLease(job.id, "other", 30)).rejects.toThrow();

        await repo.renewLease(job.id, "w1", 120);
        const after = await db.prisma.job.findUniqueOrThrow({
            where: { id: job.id },
        });
        expect(after.leaseExpiresAt!.getTime()).toBeGreaterThan(
            before.leaseExpiresAt!.getTime(),
        );
    });

    it("reclaimFromDeadWorkers requeues a dead worker's in-flight jobs", async () => {
        await seed([{}, {}]);
        const a = await repo.claim({ ...lease, workerId: "dead-1", batchSize: 1 });
        await repo.claim({ ...lease, workerId: "alive-1", batchSize: 1 });

        const count = await repo.reclaimFromDeadWorkers(["dead-1"]);

        expect(count).toBe(1);
        const reclaimed = await db.prisma.job.findUniqueOrThrow({
            where: { id: a[0].id },
        });
        expect(reclaimed.status).toBe("QUEUED");
        expect(reclaimed.lockedBy).toBeNull();
        expect(reclaimed.leaseExpiresAt).toBeNull();
        // the other worker's job is untouched
        const stillProcessing = await db.prisma.job.count({
            where: { status: "PROCESSING" },
        });
        expect(stillProcessing).toBe(1);
    });

    it("reclaimExpiredLeases requeues jobs whose lease has passed", async () => {
        await seed([{}]);
        const [job] = await repo.claim({
            ...lease,
            workerId: "w1",
            batchSize: 1,
            leaseSeconds: 1,
        });
        await db.prisma.job.update({
            where: { id: job.id },
            data: { leaseExpiresAt: new Date(Date.now() - 1000) },
        });

        const count = await repo.reclaimExpiredLeases();

        expect(count).toBe(1);
        const reclaimed = await db.prisma.job.findUniqueOrThrow({
            where: { id: job.id },
        });
        expect(reclaimed.status).toBe("QUEUED");
        expect(reclaimed.lockedBy).toBeNull();
    });

    it("reclaimFromDeadWorkers is a no-op for an empty list", async () => {
        expect(await repo.reclaimFromDeadWorkers([])).toBe(0);
    });

    it("promotePendingJobs queues only PENDING jobs whose run_at has arrived", async () => {
        const due = await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "PENDING",
                runAt: new Date(Date.now() - 1000),
            },
        });
        const notYetDue = await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "PENDING",
                runAt: new Date(Date.now() + 60_000),
            },
        });

        const count = await repo.promotePendingJobs();

        expect(count).toBe(1);
        expect(
            (await db.prisma.job.findUniqueOrThrow({ where: { id: due.id } }))
                .status,
        ).toBe("QUEUED");
        expect(
            (
                await db.prisma.job.findUniqueOrThrow({
                    where: { id: notYetDue.id },
                })
            ).status,
        ).toBe("PENDING");
    });

    it("listDeadLetter paginates DEAD_LETTER jobs, most recent first", async () => {
        await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "DEAD_LETTER",
                lastError: "boom",
            },
        });
        await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "QUEUED",
            },
        });

        const page = await repo.listDeadLetter({ limit: 10, offset: 0 });

        expect(page.total).toBe(1);
        expect(page.jobs).toHaveLength(1);
        expect(page.jobs[0].status).toBe("DEAD_LETTER");
    });

    it("retryDeadLetterJob requeues with attempts reset, and rejects a job that isn't dead-lettered", async () => {
        const deadLettered = await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "DEAD_LETTER",
                attempts: 5,
                maxAttempts: 5,
                lastError: "boom",
            },
        });
        const stillQueued = await db.prisma.job.create({
            data: {
                id: uuidv7(),
                type: "send_email",
                payload: {},
                status: "QUEUED",
            },
        });

        await expect(repo.retryDeadLetterJob(stillQueued.id)).rejects.toThrow();

        const retried = await repo.retryDeadLetterJob(deadLettered.id);
        expect(retried.status).toBe("QUEUED");
        expect(retried.attempts).toBe(0);
        expect(retried.lastError).toBeNull();
    });
});
