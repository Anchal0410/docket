import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { MetricsService } from "#metrics/metrics.service.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { FailJobCommand } from "./fail-job.command.js";

@Injectable()
export class FailJobHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
        private readonly config: ConfigService,
        private readonly metrics: MetricsService,
    ) {}

    async execute(cmd: FailJobCommand): Promise<JobVO> {
        const job = await this.jobs.fail({
            jobId: cmd.jobId,
            workerId: cmd.workerId,
            error: cmd.error,
            backoff: {
                baseSeconds: this.config.getOrThrow<number>(
                    "queue.backoffBaseSeconds",
                ),
                maxSeconds: this.config.getOrThrow<number>(
                    "queue.backoffMaxSeconds",
                ),
            },
        });

        if (job.status === "DEAD_LETTER") {
            this.metrics.incJobsDeadLettered(job.type);
        } else {
            this.metrics.incJobsFailed(job.type);
        }
        return job;
    }
}
