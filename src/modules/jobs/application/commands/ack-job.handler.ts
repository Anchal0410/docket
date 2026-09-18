import { Inject, Injectable } from "@nestjs/common";

import { MetricsService } from "#metrics/metrics.service.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { AckJobCommand } from "./ack-job.command.js";

@Injectable()
export class AckJobHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
        private readonly metrics: MetricsService,
    ) {}

    async execute(cmd: AckJobCommand): Promise<JobVO> {
        const job = await this.jobs.ack(cmd.jobId, cmd.workerId, cmd.result);
        this.metrics.incJobsCompleted(job.type);
        return job;
    }
}
