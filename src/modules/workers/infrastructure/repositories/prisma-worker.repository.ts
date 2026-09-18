import { Injectable } from "@nestjs/common";

import { Prisma, type Worker } from "#db";
import { PrismaAdapter } from "#infra/database/adapters/prisma.adapter.js";

import {
    type IWorkerRepository,
    type RegisterWorkerInput,
} from "../../domain/ports/worker.repository.port.js";
import type {
    WorkerStatus,
    WorkerVO,
} from "../../domain/value-objects/worker.vo.js";

@Injectable()
export class PrismaWorkerRepository implements IWorkerRepository {
    constructor(private readonly prisma: PrismaAdapter) {}

    async register(input: RegisterWorkerInput): Promise<WorkerVO> {
        const row = await this.prisma.worker.upsert({
            where: { workerId: input.workerId },
            create: {
                workerId: input.workerId,
                capabilities: input.capabilities,
                concurrency: input.concurrency,
            },
            update: {
                capabilities: input.capabilities,
                concurrency: input.concurrency,
                status: "ONLINE",
                lastHeartbeatAt: new Date(),
            },
        });
        return this.toDomain(row);
    }

    async findById(workerId: string): Promise<WorkerVO | null> {
        const row = await this.prisma.worker.findUnique({ where: { workerId } });
        return row ? this.toDomain(row) : null;
    }

    async heartbeat(workerId: string): Promise<boolean> {
        const { count } = await this.prisma.worker.updateMany({
            where: { workerId },
            data: { lastHeartbeatAt: new Date(), status: "ONLINE" },
        });
        return count > 0;
    }

    async markStaleWorkersDead(thresholdSeconds: number): Promise<string[]> {
        const rows = await this.prisma.$queryRaw<{ worker_id: string }[]>(
            Prisma.sql`
                UPDATE workers SET status = 'DEAD'
                WHERE status = 'ONLINE'
                  AND last_heartbeat_at < now() - make_interval(secs => ${thresholdSeconds}::int)
                RETURNING worker_id;
            `,
        );
        return rows.map((r) => r.worker_id);
    }

    async deregister(workerId: string): Promise<void> {
        await this.prisma.worker.deleteMany({ where: { workerId } });
    }

    private toDomain(row: Worker): WorkerVO {
        return {
            workerId: row.workerId,
            capabilities: row.capabilities,
            concurrency: row.concurrency,
            status: row.status as WorkerStatus,
            currentJobCount: row.currentJobCount,
            registeredAt: row.registeredAt,
            lastHeartbeatAt: row.lastHeartbeatAt,
        };
    }
}
