import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { SchedulerRegistry } from "@nestjs/schedule";

import { makeMetricsServiceMock } from "#metrics/testing/metrics-service.mock.js";

import { makeJobRepositoryMock } from "../../application/testing/job-repository.mock.js";
import { JobPromotionScheduler } from "./job-promotion.scheduler.js";

beforeAll(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
});

const config = {
    getOrThrow: (key: string) =>
        ({ "queue.promotionIntervalMs": 1000 })[key],
} as unknown as ConfigService;

const registry = {} as unknown as SchedulerRegistry;

describe("JobPromotionScheduler.sweep", () => {
    it("promotes due PENDING jobs to QUEUED", async () => {
        const jobs = makeJobRepositoryMock({
            promotePendingJobs: jest.fn().mockResolvedValue(3),
        });

        const metrics = makeMetricsServiceMock();
        await new JobPromotionScheduler(jobs, config, registry, metrics).sweep();

        expect(jobs.promotePendingJobs).toHaveBeenCalledTimes(1);
        expect(metrics.incPromotionPromoted).toHaveBeenCalledWith(3);
    });

    it("does not overlap a slow sweep with the next tick", async () => {
        let release: () => void = () => undefined;
        const jobs = makeJobRepositoryMock({
            promotePendingJobs: jest.fn().mockImplementation(
                () =>
                    new Promise<number>((resolve) => {
                        release = () => resolve(0);
                    }),
            ),
        });
        const scheduler = new JobPromotionScheduler(
            jobs,
            config,
            registry,
            makeMetricsServiceMock(),
        );

        const first = scheduler.sweep();
        await scheduler.sweep(); // should return immediately, no-op
        expect(jobs.promotePendingJobs).toHaveBeenCalledTimes(1);

        release();
        await first;
    });
});
