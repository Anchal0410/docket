import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { RenewLeaseCommand } from "./renew-lease.command.js";

@Injectable()
export class RenewLeaseHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
        private readonly config: ConfigService,
    ) {}

    execute(cmd: RenewLeaseCommand): Promise<JobVO> {
        return this.jobs.renewLease(
            cmd.jobId,
            cmd.workerId,
            this.config.getOrThrow<number>("queue.leaseSeconds"),
        );
    }
}
