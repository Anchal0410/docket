import { AppError } from "#common/errors/index.js";

import { makeWorkerRepositoryMock } from "../testing/worker-repository.mock.js";
import { HeartbeatWorkerCommand } from "./heartbeat-worker.command.js";
import { HeartbeatWorkerHandler } from "./heartbeat-worker.handler.js";

describe("HeartbeatWorkerHandler", () => {
    it("records the heartbeat for a known worker", async () => {
        const repo = makeWorkerRepositoryMock({
            heartbeat: jest.fn().mockResolvedValue(true),
        });
        await new HeartbeatWorkerHandler(repo).execute(
            new HeartbeatWorkerCommand("worker-1"),
        );
        expect(repo.heartbeat).toHaveBeenCalledWith("worker-1");
    });

    it("rejects a heartbeat from an unknown worker", async () => {
        const repo = makeWorkerRepositoryMock({
            heartbeat: jest.fn().mockResolvedValue(false),
        });
        await expect(
            new HeartbeatWorkerHandler(repo).execute(
                new HeartbeatWorkerCommand("ghost"),
            ),
        ).rejects.toThrow(AppError);
    });
});
