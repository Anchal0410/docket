import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AppError } from "#common/errors/index.js";
import { MetricsService } from "#metrics/metrics.service.js";
import {
    WORKER_REPOSITORY,
    type IWorkerRepository,
} from "#modules/workers/domain/ports/worker.repository.port.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { ClaimJobsCommand } from "./claim-jobs.command.js";

@Injectable()
export class ClaimJobsHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
        @Inject(WORKER_REPOSITORY)
        private readonly workers: IWorkerRepository,
        private readonly config: ConfigService,
        private readonly metrics: MetricsService,
    ) {}

    async execute(cmd: ClaimJobsCommand): Promise<JobVO[]> {
        const worker = await this.workers.findById(cmd.workerId);
        if (!worker) {
            throw new AppError(
                "WORKER_NOT_REGISTERED",
                409,
                "Register the worker before claiming jobs.",
            );
        }

        const maxBatch = this.config.getOrThrow<number>("queue.claimMaxBatch");

        const jobs = await this.jobs.claim({
            workerId: worker.workerId,
            capabilities: worker.capabilities,
            batchSize: Math.min(Math.max(1, cmd.batchSize), maxBatch),
            leaseSeconds: this.config.getOrThrow<number>("queue.leaseSeconds"),
            typeConcurrencyLimits: this.config.getOrThrow<Record<string, number>>(
                "queue.typeConcurrencyLimits",
            ),
        });
        this.metrics.observeClaimBatchSize(jobs.length);
        return jobs;
    }
}
