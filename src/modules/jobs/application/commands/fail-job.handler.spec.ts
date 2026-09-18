import type { ConfigService } from "@nestjs/config";

import { makeMetricsServiceMock } from "#metrics/testing/metrics-service.mock.js";

import type {
    FailJobInput,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
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
    it("forwards the fail with backoff params from config, and records a retry", async () => {
        const requeued = { type: "send_email", status: "QUEUED" } as JobVO;
        const jobs = makeJobRepositoryMock({
            fail: jest.fn().mockResolvedValue(requeued),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new FailJobHandler(jobs, config, metrics);

        await handler.execute(new FailJobCommand("job-1", "worker-1", "boom"));

        const input = jobs.fail.mock.calls[0][0] as FailJobInput;
        expect(input).toEqual({
            jobId: "job-1",
            workerId: "worker-1",
            error: "boom",
            backoff: { baseSeconds: 2, maxSeconds: 3600 },
        });
        expect(metrics.incJobsFailed).toHaveBeenCalledWith("send_email");
        expect(metrics.incJobsDeadLettered).not.toHaveBeenCalled();
    });

    it("records a dead-letter instead of a retry once maxAttempts is exhausted", async () => {
        const deadLettered = {
            type: "send_email",
            status: "DEAD_LETTER",
        } as JobVO;
        const jobs = makeJobRepositoryMock({
            fail: jest.fn().mockResolvedValue(deadLettered),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new FailJobHandler(jobs, config, metrics);

        await handler.execute(new FailJobCommand("job-1", "worker-1", "boom"));

        expect(metrics.incJobsDeadLettered).toHaveBeenCalledWith("send_email");
        expect(metrics.incJobsFailed).not.toHaveBeenCalled();
    });
});
