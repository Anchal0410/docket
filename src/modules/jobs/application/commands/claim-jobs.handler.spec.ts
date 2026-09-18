import type { ConfigService } from "@nestjs/config";

import { AppError } from "#common/errors/index.js";
import type { WorkerVO } from "#modules/workers/domain/value-objects/worker.vo.js";
import { makeWorkerRepositoryMock } from "#modules/workers/application/testing/worker-repository.mock.js";

import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { ClaimJobsCommand } from "./claim-jobs.command.js";
import { ClaimJobsHandler } from "./claim-jobs.handler.js";

const config = {
    getOrThrow: (key: string) =>
        ({ "queue.claimMaxBatch": 10, "queue.leaseSeconds": 30 })[key],
} as unknown as ConfigService;

function makeWorker(overrides: Partial<WorkerVO> = {}): WorkerVO {
    return {
        workerId: "worker-1",
        capabilities: ["send_email", "generate_report"],
        concurrency: 4,
        status: "ONLINE",
        currentJobCount: 0,
        registeredAt: new Date(),
        lastHeartbeatAt: new Date(),
        ...overrides,
    };
}

describe("ClaimJobsHandler", () => {
    it("claims with the worker's stored capabilities and a clamped batch size", async () => {
        const jobs = makeJobRepositoryMock({
            claim: jest.fn().mockResolvedValue([]),
        });
        const workers = makeWorkerRepositoryMock({
            findById: jest.fn().mockResolvedValue(makeWorker()),
        });
        const handler = new ClaimJobsHandler(jobs, workers, config);

        await handler.execute(new ClaimJobsCommand("worker-1", 999));

        expect(jobs.claim).toHaveBeenCalledWith({
            workerId: "worker-1",
            capabilities: ["send_email", "generate_report"],
            batchSize: 10,
            leaseSeconds: 30,
        });
    });

    it("rejects a claim from an unregistered worker", async () => {
        const jobs = makeJobRepositoryMock();
        const workers = makeWorkerRepositoryMock({
            findById: jest.fn().mockResolvedValue(null),
        });
        const handler = new ClaimJobsHandler(jobs, workers, config);

        await expect(
            handler.execute(new ClaimJobsCommand("ghost", 1)),
        ).rejects.toThrow(AppError);
        expect(jobs.claim).not.toHaveBeenCalled();
    });
});
