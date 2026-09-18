import { Inject, Injectable } from "@nestjs/common";

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
    ) {}

    execute(cmd: CancelJobCommand): Promise<JobVO> {
        return this.jobs.cancel(cmd.jobId);
    }
}
