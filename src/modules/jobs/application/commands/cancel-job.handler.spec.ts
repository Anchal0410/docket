import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { CancelJobCommand } from "./cancel-job.command.js";
import { CancelJobHandler } from "./cancel-job.handler.js";

describe("CancelJobHandler", () => {
    it("forwards the cancel to the port", async () => {
        const cancelled = { id: "job-1", status: "CANCELLED" } as JobVO;
        const jobs = makeJobRepositoryMock({
            cancel: jest.fn().mockResolvedValue(cancelled),
        });
        const handler = new CancelJobHandler(jobs);

        const result = await handler.execute(new CancelJobCommand("job-1"));

        expect(jobs.cancel).toHaveBeenCalledWith("job-1");
        expect(result).toBe(cancelled);
    });
});
