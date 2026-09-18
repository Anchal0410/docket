import { makeMetricsServiceMock } from "#metrics/testing/metrics-service.mock.js";

import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { AckJobCommand } from "./ack-job.command.js";
import { AckJobHandler } from "./ack-job.handler.js";

describe("AckJobHandler", () => {
    it("forwards the ack to the port and records completion", async () => {
        const completed = {
            id: "job-1",
            type: "send_email",
            status: "COMPLETED",
        } as JobVO;
        const jobs = makeJobRepositoryMock({
            ack: jest.fn().mockResolvedValue(completed),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new AckJobHandler(jobs, metrics);

        const result = await handler.execute(
            new AckJobCommand("job-1", "worker-1", { deliveredTo: "a@b.com" }),
        );

        expect(jobs.ack).toHaveBeenCalledWith("job-1", "worker-1", {
            deliveredTo: "a@b.com",
        });
        expect(result).toBe(completed);
        expect(metrics.incJobsCompleted).toHaveBeenCalledWith("send_email");
    });
});
