import { Inject, Injectable } from "@nestjs/common";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { RetryDeadLetterJobCommand } from "./retry-dead-letter-job.command.js";

@Injectable()
export class RetryDeadLetterJobHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
    ) {}

    execute(cmd: RetryDeadLetterJobCommand): Promise<JobVO> {
        return this.jobs.retryDeadLetterJob(cmd.jobId);
    }
}
