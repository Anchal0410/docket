import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { SchedulerRegistry } from "@nestjs/schedule";

import { makeWorkerRepositoryMock } from "#modules/workers/application/testing/worker-repository.mock.js";

import { makeJobRepositoryMock } from "../../application/testing/job-repository.mock.js";
import { JobRecoveryScheduler } from "./job-recovery.scheduler.js";

beforeAll(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
});

const config = {
    getOrThrow: (key: string) =>
        ({
            "queue.deadWorkerThresholdSeconds": 15,
            "queue.recoveryIntervalMs": 5000,
        })[key],
} as unknown as ConfigService;

const registry = {} as unknown as SchedulerRegistry;

describe("JobRecoveryScheduler.sweep", () => {
    it("marks stale workers dead, then reclaims their jobs, then expired leases", async () => {
        const calls: string[] = [];
        const workers = makeWorkerRepositoryMock({
            markStaleWorkersDead: jest.fn().mockImplementation(() => {
                calls.push("markStaleWorkersDead");
                return Promise.resolve(["w-dead"]);
            }),
        });
        const jobs = makeJobRepositoryMock({
            reclaimFromDeadWorkers: jest.fn().mockImplementation((ids: string[]) => {
                calls.push("reclaimFromDeadWorkers");
                expect(ids).toEqual(["w-dead"]);
                return Promise.resolve(2);
            }),
            reclaimExpiredLeases: jest.fn().mockImplementation(() => {
                calls.push("reclaimExpiredLeases");
                return Promise.resolve(1);
            }),
        });

        await new JobRecoveryScheduler(jobs, workers, config, registry).sweep();

        expect(calls).toEqual([
            "markStaleWorkersDead",
            "reclaimFromDeadWorkers",
            "reclaimExpiredLeases",
        ]);
        expect(workers.markStaleWorkersDead).toHaveBeenCalledWith(15);
    });

    it("does not overlap a slow sweep with the next tick", async () => {
        let release: () => void = () => undefined;
        const workers = makeWorkerRepositoryMock({
            markStaleWorkersDead: jest.fn().mockImplementation(
                () =>
                    new Promise<string[]>((resolve) => {
                        release = () => resolve([]);
                    }),
            ),
        });
        const jobs = makeJobRepositoryMock({
            reclaimFromDeadWorkers: jest.fn().mockResolvedValue(0),
            reclaimExpiredLeases: jest.fn().mockResolvedValue(0),
        });
        const scheduler = new JobRecoveryScheduler(jobs, workers, config, registry);

        const first = scheduler.sweep();
        await scheduler.sweep(); // should return immediately, no-op
        expect(workers.markStaleWorkersDead).toHaveBeenCalledTimes(1);

        release();
        await first;
    });
});
