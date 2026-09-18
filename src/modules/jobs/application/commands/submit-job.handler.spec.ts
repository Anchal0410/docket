import type { ConfigService } from "@nestjs/config";

import { AppError } from "#common/errors/index.js";
import { makeMetricsServiceMock } from "#metrics/testing/metrics-service.mock.js";

import type { SubmitJobInput } from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { SubmitJobCommand } from "./submit-job.command.js";
import { SubmitJobHandler } from "./submit-job.handler.js";

const config = {
    getOrThrow: (key: string) =>
        ({ "queue.maxBacklogDepth": 10000 })[key],
} as unknown as ConfigService;

function makeJob(overrides: Partial<JobVO> = {}): JobVO {
    return {
        id: "01930000-0000-7000-0000-000000000000",
        idempotencyKey: null,
        type: "send_email",
        payload: { to: "user@example.com" },
        priority: 1,
        status: "QUEUED",
        cancelRequested: false,
        runAt: new Date(),
        attempts: 0,
        maxAttempts: 5,
        lastError: null,
        result: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        ...overrides,
    };
}

describe("SubmitJobHandler", () => {
    it("submits a job with a generated id and the command's fields", async () => {
        const job = makeJob();
        const repo = makeJobRepositoryMock({
            submit: jest.fn().mockResolvedValue(job),
            countBacklog: jest.fn().mockResolvedValue(0),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new SubmitJobHandler(repo, config, metrics);

        const result = await handler.execute(
            new SubmitJobCommand("send_email", { to: "user@example.com" }),
        );

        const input = repo.submit.mock.calls[0][0] as SubmitJobInput;
        expect(input.type).toBe("send_email");
        expect(input.payload).toEqual({ to: "user@example.com" });
        expect(input.priority).toBe(1);
        expect(input.maxAttempts).toBe(5);
        expect(input.id).toHaveLength(36);
        expect(result).toBe(job);
        expect(metrics.incJobsSubmitted).toHaveBeenCalledWith("send_email");
    });

    it("passes the idempotency key through when provided", async () => {
        const repo = makeJobRepositoryMock({
            submit: jest.fn().mockResolvedValue(makeJob()),
            countBacklog: jest.fn().mockResolvedValue(0),
        });
        const handler = new SubmitJobHandler(
            repo,
            config,
            makeMetricsServiceMock(),
        );

        await handler.execute(
            new SubmitJobCommand(
                "charge_card",
                { amount: 100 },
                2,
                new Date(),
                3,
                "payment_123",
            ),
        );

        const input = repo.submit.mock.calls[0][0] as SubmitJobInput;
        expect(input.idempotencyKey).toBe("payment_123");
        expect(input.priority).toBe(2);
        expect(input.maxAttempts).toBe(3);
    });

    it("rejects with 503 and records it when the backlog is at capacity", async () => {
        const repo = makeJobRepositoryMock({
            countBacklog: jest.fn().mockResolvedValue(10000),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new SubmitJobHandler(repo, config, metrics);

        await expect(
            handler.execute(new SubmitJobCommand("send_email", {})),
        ).rejects.toThrow(AppError);
        expect(repo.submit).not.toHaveBeenCalled();
        expect(metrics.incSubmissionsRejected).toHaveBeenCalledTimes(1);
    });
});
