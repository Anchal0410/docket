import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
    ) {}

    execute(cmd: FailJobCommand): Promise<JobVO> {
        return this.jobs.fail({
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
    }
}
