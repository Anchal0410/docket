import { Inject, Injectable } from "@nestjs/common";

import { MetricsService } from "#metrics/metrics.service.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { CancelJobCommand } from "./cancel-job.command.js";

@Injectable()
export class CancelJobHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
        private readonly metrics: MetricsService,
    ) {}

    async execute(cmd: CancelJobCommand): Promise<JobVO> {
        const job = await this.jobs.cancel(cmd.jobId);
        if (job.status === "CANCELLED") {
            this.metrics.incJobsCancelled(job.type);
        }
        return job;
    }
}
