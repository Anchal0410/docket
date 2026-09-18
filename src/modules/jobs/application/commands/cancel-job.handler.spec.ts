import { makeMetricsServiceMock } from "#metrics/testing/metrics-service.mock.js";

import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { CancelJobCommand } from "./cancel-job.command.js";
import { CancelJobHandler } from "./cancel-job.handler.js";

describe("CancelJobHandler", () => {
    it("forwards the cancel to the port and records it when actually cancelled", async () => {
        const cancelled = {
            id: "job-1",
            type: "send_email",
            status: "CANCELLED",
        } as JobVO;
        const jobs = makeJobRepositoryMock({
            cancel: jest.fn().mockResolvedValue(cancelled),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new CancelJobHandler(jobs, metrics);

        const result = await handler.execute(new CancelJobCommand("job-1"));

        expect(jobs.cancel).toHaveBeenCalledWith("job-1");
        expect(result).toBe(cancelled);
        expect(metrics.incJobsCancelled).toHaveBeenCalledWith("send_email");
    });

    it("does not record a cancellation when only cancelRequested was flagged", async () => {
        const stillProcessing = {
            id: "job-1",
            type: "send_email",
            status: "PROCESSING",
            cancelRequested: true,
        } as JobVO;
        const jobs = makeJobRepositoryMock({
            cancel: jest.fn().mockResolvedValue(stillProcessing),
        });
        const metrics = makeMetricsServiceMock();
        const handler = new CancelJobHandler(jobs, metrics);

        await handler.execute(new CancelJobCommand("job-1"));

        expect(metrics.incJobsCancelled).not.toHaveBeenCalled();
    });
});
