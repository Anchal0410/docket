import type { JobVO } from "../../domain/value-objects/job.vo.js";
import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { ListDeadLetterJobsHandler } from "./list-dead-letter-jobs.handler.js";
import { ListDeadLetterJobsQuery } from "./list-dead-letter-jobs.query.js";

describe("ListDeadLetterJobsHandler", () => {
    it("forwards limit/offset to the port", async () => {
        const page = { jobs: [{ id: "job-1" } as JobVO], total: 1 };
        const jobs = makeJobRepositoryMock({
            listDeadLetter: jest.fn().mockResolvedValue(page),
        });
        const handler = new ListDeadLetterJobsHandler(jobs);

        const result = await handler.execute(new ListDeadLetterJobsQuery(20, 0));

        expect(jobs.listDeadLetter).toHaveBeenCalledWith({
            limit: 20,
            offset: 0,
        });
        expect(result).toBe(page);
    });
});
