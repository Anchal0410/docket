import {
    Inject,
    Injectable,
    Logger,
    type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";

import { MetricsService } from "#metrics/metrics.service.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";

/**
 * Activates delayed and scheduled jobs. Runs on a fixed interval and
 * promotes any PENDING job whose run_at has arrived to QUEUED — claim only
 * ever looks at QUEUED, so without this a delayed job would sit PENDING
 * forever no matter how much time passed.
 */
@Injectable()
export class JobPromotionScheduler implements OnModuleInit {
    private readonly logger = new Logger(JobPromotionScheduler.name);
    private running = false;

    constructor(
        @Inject(JOB_REPOSITORY) private readonly jobs: IJobRepository,
        private readonly config: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly metrics: MetricsService,
    ) {}

    onModuleInit(): void {
        const ms = this.config.getOrThrow<number>("queue.promotionIntervalMs");
        const timer = setInterval(() => void this.sweep(), ms);
        this.schedulerRegistry.addInterval("job-promotion", timer);
    }

    async sweep(): Promise<void> {
        if (this.running) return; // don't let a slow sweep overlap the next tick
        this.running = true;
        try {
            const promoted = await this.jobs.promotePendingJobs();
            this.metrics.incPromotionPromoted(promoted);
            if (promoted) {
                this.logger.log(`${promoted} job(s) promoted PENDING -> QUEUED`);
            }
        } catch (err) {
            this.logger.error(err, "promotion sweep failed");
        } finally {
            this.running = false;
        }
    }
}
