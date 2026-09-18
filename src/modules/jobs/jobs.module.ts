import { Module } from "@nestjs/common";

import { WorkersModule } from "#modules/workers/workers.module.js";

import { AckJobHandler } from "./application/commands/ack-job.handler.js";
import { ClaimJobsHandler } from "./application/commands/claim-jobs.handler.js";
import { FailJobHandler } from "./application/commands/fail-job.handler.js";
import { RenewLeaseHandler } from "./application/commands/renew-lease.handler.js";
import { SubmitJobHandler } from "./application/commands/submit-job.handler.js";
import { GetJobHandler } from "./application/queries/get-job.handler.js";
import { JOB_REPOSITORY } from "./domain/ports/job.repository.port.js";
import { JobsController } from "./http/jobs.controller.js";
import { PrismaJobRepository } from "./infrastructure/repositories/prisma-job.repository.js";
import { JobRecoveryScheduler } from "./infrastructure/schedulers/job-recovery.scheduler.js";

@Module({
    imports: [WorkersModule],
    controllers: [JobsController],
    providers: [
        SubmitJobHandler,
        GetJobHandler,
        ClaimJobsHandler,
        AckJobHandler,
        FailJobHandler,
        RenewLeaseHandler,
        JobRecoveryScheduler,
        { provide: JOB_REPOSITORY, useClass: PrismaJobRepository },
    ],
    exports: [JOB_REPOSITORY],
})
export class JobsModule {}
