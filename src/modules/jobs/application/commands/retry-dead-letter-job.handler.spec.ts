import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { RetryDeadLetterJobCommand } from "./retry-dead-letter-job.command.js";
import { RetryDeadLetterJobHandler } from "./retry-dead-letter-job.handler.js";

describe("RetryDeadLetterJobHandler", () => {
    it("forwards the retry to the port", async () => {
        const requeued = { id: "job-1", status: "QUEUED", attempts: 0 } as JobVO;
        const jobs = makeJobRepositoryMock({
            retryDeadLetterJob: jest.fn().mockResolvedValue(requeued),
        });
        const handler = new RetryDeadLetterJobHandler(jobs);

        const result = await handler.execute(
            new RetryDeadLetterJobCommand("job-1"),
        );

        expect(jobs.retryDeadLetterJob).toHaveBeenCalledWith("job-1");
        expect(result).toBe(requeued);
    });
});
