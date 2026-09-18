import { AppError } from "#common/errors/index.js";

import type { WorkerVO } from "../../domain/value-objects/worker.vo.js";
import { makeWorkerRepositoryMock } from "../testing/worker-repository.mock.js";
import { RegisterWorkerCommand } from "./register-worker.command.js";
import { RegisterWorkerHandler } from "./register-worker.handler.js";

function makeWorker(overrides: Partial<WorkerVO> = {}): WorkerVO {
    return {
        workerId: "worker-1",
        capabilities: ["send_email"],
        concurrency: 1,
        status: "ONLINE",
        currentJobCount: 0,
        registeredAt: new Date(),
        lastHeartbeatAt: new Date(),
        ...overrides,
    };
}

describe("RegisterWorkerHandler", () => {
    it("registers a worker through the port", async () => {
        const worker = makeWorker();
        const repo = makeWorkerRepositoryMock({
            register: jest.fn().mockResolvedValue(worker),
        });
        const handler = new RegisterWorkerHandler(repo);

        const result = await handler.execute(
            new RegisterWorkerCommand("worker-1", ["send_email"], 4),
        );

        expect(repo.register).toHaveBeenCalledWith({
            workerId: "worker-1",
            capabilities: ["send_email"],
            concurrency: 4,
        });
        expect(result).toBe(worker);
    });

    it("rejects a worker with no capabilities", async () => {
        const repo = makeWorkerRepositoryMock();
        const handler = new RegisterWorkerHandler(repo);

        await expect(
            handler.execute(new RegisterWorkerCommand("worker-1", [], 1)),
        ).rejects.toThrow(AppError);
        expect(repo.register).not.toHaveBeenCalled();
    });
});
