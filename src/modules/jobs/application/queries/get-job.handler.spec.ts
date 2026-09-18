import { AppError } from "#common/errors/index.js";

import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { GetJobHandler } from "./get-job.handler.js";
import { GetJobQuery } from "./get-job.query.js";

function makeJob(): JobVO {
    return {
        id: "01930000-0000-7000-0000-000000000000",
        idempotencyKey: null,
        type: "send_email",
        payload: {},
        priority: 1,
        status: "COMPLETED",
        cancelRequested: false,
        runAt: new Date(),
        attempts: 1,
        maxAttempts: 5,
        lastError: null,
        result: { ok: true },
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
    };
}

describe("GetJobHandler", () => {
    it("returns the job when found", async () => {
        const job = makeJob();
        const repo = makeJobRepositoryMock({
            findById: jest.fn().mockResolvedValue(job),
        });
        const handler = new GetJobHandler(repo);

        const result = await handler.execute(new GetJobQuery(job.id));

        expect(result).toBe(job);
    });

    it("throws AppError.notFound when the job does not exist", async () => {
        const repo = makeJobRepositoryMock({
            findById: jest.fn().mockResolvedValue(null),
        });
        const handler = new GetJobHandler(repo);

        await expect(
            handler.execute(new GetJobQuery("missing-id")),
        ).rejects.toThrow(AppError);
    });
});
