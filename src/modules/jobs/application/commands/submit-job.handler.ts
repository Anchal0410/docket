import { Inject, Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";

import { MetricsService } from "#metrics/metrics.service.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { SubmitJobCommand } from "./submit-job.command.js";

@Injectable()
export class SubmitJobHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
        private readonly metrics: MetricsService,
    ) {}

    async execute(cmd: SubmitJobCommand): Promise<JobVO> {
        const job = await this.jobs.submit({
            id: uuidv7(),
            type: cmd.type,
            payload: cmd.payload,
            priority: cmd.priority,
            runAt: cmd.runAt,
            maxAttempts: cmd.maxAttempts,
            idempotencyKey: cmd.idempotencyKey,
        });
        this.metrics.incJobsSubmitted(job.type);
        return job;
    }
}
