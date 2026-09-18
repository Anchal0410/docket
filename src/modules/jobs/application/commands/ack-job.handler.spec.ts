import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { AckJobCommand } from "./ack-job.command.js";
import { AckJobHandler } from "./ack-job.handler.js";

describe("AckJobHandler", () => {
    it("forwards the ack to the port", async () => {
        const completed = { id: "job-1", status: "COMPLETED" } as JobVO;
        const jobs = makeJobRepositoryMock({
            ack: jest.fn().mockResolvedValue(completed),
        });
        const handler = new AckJobHandler(jobs);

        const result = await handler.execute(
            new AckJobCommand("job-1", "worker-1", { deliveredTo: "a@b.com" }),
        );

        expect(jobs.ack).toHaveBeenCalledWith("job-1", "worker-1", {
            deliveredTo: "a@b.com",
        });
        expect(result).toBe(completed);
    });
});
