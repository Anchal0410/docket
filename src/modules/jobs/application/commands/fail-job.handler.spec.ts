import type { ConfigService } from "@nestjs/config";

import type { FailJobInput } from "../../domain/ports/job.repository.port.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { FailJobCommand } from "./fail-job.command.js";
import { FailJobHandler } from "./fail-job.handler.js";

const config = {
    getOrThrow: (key: string) =>
        ({
            "queue.backoffBaseSeconds": 2,
            "queue.backoffMaxSeconds": 3600,
        })[key],
} as unknown as ConfigService;

describe("FailJobHandler", () => {
    it("forwards the fail with backoff params from config", async () => {
        const jobs = makeJobRepositoryMock({
            fail: jest.fn().mockResolvedValue({}),
        });
        const handler = new FailJobHandler(jobs, config);

        await handler.execute(new FailJobCommand("job-1", "worker-1", "boom"));

        const input = jobs.fail.mock.calls[0][0] as FailJobInput;
        expect(input).toEqual({
            jobId: "job-1",
            workerId: "worker-1",
            error: "boom",
            backoff: { baseSeconds: 2, maxSeconds: 3600 },
        });
    });
});
