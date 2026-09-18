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
    WORKER_REPOSITORY,
    type IWorkerRepository,
} from "#modules/workers/domain/ports/worker.repository.port.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";

/**
 * Recovers work abandoned by workers that disappeared. Runs on a fixed
 * interval and does three things in order, coordinating both aggregates:
 *
 *   1. mark workers that stopped heartbeating as DEAD
 *   2. requeue those workers' in-flight jobs immediately (fast path)
 *   3. requeue any job whose lease expired regardless of worker status
 *      (safety net — catches a worker that heartbeats fine but hangs on
 *      one job)
 *
 * Both (2) and (3) exist on purpose: heartbeat detection is fast but
 * whole-worker; lease expiry is slower but per-job and catches everything.
 */
@Injectable()
export class JobRecoveryScheduler implements OnModuleInit {
    private readonly logger = new Logger(JobRecoveryScheduler.name);
    private running = false;

    constructor(
        @Inject(JOB_REPOSITORY) private readonly jobs: IJobRepository,
        @Inject(WORKER_REPOSITORY) private readonly workers: IWorkerRepository,
        private readonly config: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly metrics: MetricsService,
    ) {}

    onModuleInit(): void {
        const ms = this.config.getOrThrow<number>("queue.recoveryIntervalMs");
        const timer = setInterval(() => void this.sweep(), ms);
        this.schedulerRegistry.addInterval("job-recovery", timer);
    }

    async sweep(): Promise<void> {
        if (this.running) return; // don't let a slow sweep overlap the next tick
        this.running = true;
        try {
            const threshold = this.config.getOrThrow<number>(
                "queue.deadWorkerThresholdSeconds",
            );
            const dead = await this.workers.markStaleWorkersDead(threshold);
            const fromDead = await this.jobs.reclaimFromDeadWorkers(dead);
            const expired = await this.jobs.reclaimExpiredLeases();

            this.metrics.incRecoveryDeadWorkers(dead.length);
            this.metrics.incRecoveryReclaimedFromDeadWorkers(fromDead);
            this.metrics.incRecoveryReclaimedExpiredLeases(expired);

            if (dead.length || fromDead || expired) {
                this.logger.log(
                    `${dead.length} worker(s) marked dead, ` +
                        `${fromDead} job(s) reclaimed from them, ` +
                        `${expired} expired lease(s) reclaimed`,
                );
            }
        } catch (err) {
            this.logger.error(err, "recovery sweep failed");
        } finally {
            this.running = false;
        }
    }
}
