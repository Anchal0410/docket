import type { ConfigService } from "@nestjs/config";

import { makeJobRepositoryMock } from "../testing/job-repository.mock.js";
import { RenewLeaseCommand } from "./renew-lease.command.js";
import { RenewLeaseHandler } from "./renew-lease.handler.js";

const config = {
    getOrThrow: (key: string) => ({ "queue.leaseSeconds": 30 })[key],
} as unknown as ConfigService;

describe("RenewLeaseHandler", () => {
    it("renews with the configured lease duration", async () => {
        const jobs = makeJobRepositoryMock({
            renewLease: jest.fn().mockResolvedValue({}),
        });
        const handler = new RenewLeaseHandler(jobs, config);

        await handler.execute(new RenewLeaseCommand("job-1", "worker-1"));

        expect(jobs.renewLease).toHaveBeenCalledWith("job-1", "worker-1", 30);
    });
});
