import { Module } from "@nestjs/common";

import { MetricsModule } from "#metrics/metrics.module.js";
import { WorkersModule } from "#modules/workers/workers.module.js";

import { AckJobHandler } from "./application/commands/ack-job.handler.js";
import { CancelJobHandler } from "./application/commands/cancel-job.handler.js";
import { ClaimJobsHandler } from "./application/commands/claim-jobs.handler.js";
import { FailJobHandler } from "./application/commands/fail-job.handler.js";
import { RenewLeaseHandler } from "./application/commands/renew-lease.handler.js";
import { RetryDeadLetterJobHandler } from "./application/commands/retry-dead-letter-job.handler.js";
import { SubmitJobHandler } from "./application/commands/submit-job.handler.js";
import { GetJobHandler } from "./application/queries/get-job.handler.js";
import { ListDeadLetterJobsHandler } from "./application/queries/list-dead-letter-jobs.handler.js";
import { JOB_REPOSITORY } from "./domain/ports/job.repository.port.js";
import { DeadLetterJobsController } from "./http/dead-letter-jobs.controller.js";
import { JobsController } from "./http/jobs.controller.js";
import { PrismaJobRepository } from "./infrastructure/repositories/prisma-job.repository.js";
import { JobPromotionScheduler } from "./infrastructure/schedulers/job-promotion.scheduler.js";
import { JobRecoveryScheduler } from "./infrastructure/schedulers/job-recovery.scheduler.js";

@Module({
    imports: [WorkersModule, MetricsModule],
    controllers: [JobsController, DeadLetterJobsController],
    providers: [
        SubmitJobHandler,
        GetJobHandler,
        ClaimJobsHandler,
        AckJobHandler,
        FailJobHandler,
        RenewLeaseHandler,
        CancelJobHandler,
        ListDeadLetterJobsHandler,
        RetryDeadLetterJobHandler,
        JobRecoveryScheduler,
        JobPromotionScheduler,
        { provide: JOB_REPOSITORY, useClass: PrismaJobRepository },
    ],
    exports: [JOB_REPOSITORY],
})
export class JobsModule {}
