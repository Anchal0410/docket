import {
    startTestDb,
    type TestDb,
} from "../../../../../test/support/postgres.js";
import type { PrismaAdapter } from "#infra/database/adapters/prisma.adapter.js";

import { PrismaWorkerRepository } from "./prisma-worker.repository.js";

describe("PrismaWorkerRepository (integration)", () => {
    let db: TestDb;
    let repo: PrismaWorkerRepository;

    beforeAll(async () => {
        db = await startTestDb();
        repo = new PrismaWorkerRepository(db.prisma as unknown as PrismaAdapter);
    });

    afterAll(async () => {
        await db?.stop();
    });

    beforeEach(async () => {
        await db.prisma.worker.deleteMany();
    });

    it("heartbeat bumps the timestamp and revives a DEAD worker", async () => {
        await repo.register({
            workerId: "w1",
            capabilities: ["send_email"],
            concurrency: 1,
        });
        await db.prisma.worker.update({
            where: { workerId: "w1" },
            data: { status: "DEAD", lastHeartbeatAt: new Date(0) },
        });

        const known = await repo.heartbeat("w1");

        expect(known).toBe(true);
        const row = await db.prisma.worker.findUniqueOrThrow({
            where: { workerId: "w1" },
        });
        expect(row.status).toBe("ONLINE");
        expect(row.lastHeartbeatAt.getTime()).toBeGreaterThan(0);
    });

    it("heartbeat returns false for an unknown worker", async () => {
        expect(await repo.heartbeat("ghost")).toBe(false);
    });

    it("markStaleWorkersDead flags only workers past the threshold", async () => {
        await repo.register({
            workerId: "fresh",
            capabilities: ["x"],
            concurrency: 1,
        });
        await repo.register({
            workerId: "stale",
            capabilities: ["x"],
            concurrency: 1,
        });
        await db.prisma.worker.update({
            where: { workerId: "stale" },
            data: { lastHeartbeatAt: new Date(Date.now() - 60_000) },
        });

        const dead = await repo.markStaleWorkersDead(15);

        expect(dead).toEqual(["stale"]);
        const fresh = await db.prisma.worker.findUniqueOrThrow({
            where: { workerId: "fresh" },
        });
        expect(fresh.status).toBe("ONLINE");
    });

    it("markStaleWorkersDead does not re-flag an already DEAD worker", async () => {
        await repo.register({
            workerId: "gone",
            capabilities: ["x"],
            concurrency: 1,
        });
        await db.prisma.worker.update({
            where: { workerId: "gone" },
            data: { status: "DEAD", lastHeartbeatAt: new Date(Date.now() - 60_000) },
        });

        expect(await repo.markStaleWorkersDead(15)).toEqual([]);
    });
});
