import { Injectable } from "@nestjs/common";
import {
    collectDefaultMetrics,
    Counter,
    Gauge,
    Histogram,
    Registry,
} from "prom-client";

import { PrismaAdapter } from "#infra/database/adapters/prisma.adapter.js";

@Injectable()
export class MetricsService {
    private readonly registry = new Registry();

    private readonly jobsSubmitted = new Counter({
        name: "docket_jobs_submitted_total",
        help: "Jobs submitted, by type",
        labelNames: ["type"],
        registers: [this.registry],
    });
    private readonly jobsCompleted = new Counter({
        name: "docket_jobs_completed_total",
        help: "Jobs acked as completed, by type",
        labelNames: ["type"],
        registers: [this.registry],
    });
    private readonly jobsFailed = new Counter({
        name: "docket_jobs_failed_total",
        help: "Job failures that were retried (not dead-lettered), by type",
        labelNames: ["type"],
        registers: [this.registry],
    });
    private readonly jobsDeadLettered = new Counter({
        name: "docket_jobs_dead_lettered_total",
        help: "Job failures that exhausted maxAttempts, by type",
        labelNames: ["type"],
        registers: [this.registry],
    });
    private readonly jobsCancelled = new Counter({
        name: "docket_jobs_cancelled_total",
        help: "Jobs cancelled outright (PENDING/QUEUED), by type",
        labelNames: ["type"],
        registers: [this.registry],
    });
    private readonly claimBatchSize = new Histogram({
        name: "docket_claim_batch_size",
        help: "Number of jobs returned per claim call",
        buckets: [0, 1, 2, 5, 10, 20, 50],
        registers: [this.registry],
    });
    private readonly recoveryDeadWorkers = new Counter({
        name: "docket_recovery_dead_workers_total",
        help: "Workers marked DEAD by the recovery sweep",
        registers: [this.registry],
    });
    private readonly recoveryReclaimedFromDeadWorkers = new Counter({
        name: "docket_recovery_reclaimed_from_dead_workers_total",
        help: "Jobs requeued because their worker was marked DEAD",
        registers: [this.registry],
    });
    private readonly recoveryReclaimedExpiredLeases = new Counter({
        name: "docket_recovery_reclaimed_expired_leases_total",
        help: "Jobs requeued because their lease expired",
        registers: [this.registry],
    });
    private readonly promotionPromoted = new Counter({
        name: "docket_promotion_promoted_total",
        help: "PENDING jobs promoted to QUEUED once due",
        registers: [this.registry],
    });

    constructor(prisma: PrismaAdapter) {
        collectDefaultMetrics({ register: this.registry });

        // Live-queried on every scrape rather than maintained as running
        // counters -- these are current state (a depth), not events, and
        // querying live avoids drift from a counter no one decrements.
        new Gauge({
            name: "docket_queue_depth",
            help: "Current job count per status",
            labelNames: ["status"],
            registers: [this.registry],
            async collect() {
                const rows = await prisma.job.groupBy({
                    by: ["status"],
                    _count: { _all: true },
                });
                for (const row of rows) {
                    this.set({ status: row.status }, row._count._all);
                }
            },
        });

        new Gauge({
            name: "docket_workers",
            help: "Current worker count per status",
            labelNames: ["status"],
            registers: [this.registry],
            async collect() {
                const rows = await prisma.worker.groupBy({
                    by: ["status"],
                    _count: { _all: true },
                });
                for (const row of rows) {
                    this.set({ status: row.status }, row._count._all);
                }
            },
        });
    }

    incJobsSubmitted(type: string): void {
        this.jobsSubmitted.inc({ type });
    }

    incJobsCompleted(type: string): void {
        this.jobsCompleted.inc({ type });
    }

    incJobsFailed(type: string): void {
        this.jobsFailed.inc({ type });
    }

    incJobsDeadLettered(type: string): void {
        this.jobsDeadLettered.inc({ type });
    }

    incJobsCancelled(type: string): void {
        this.jobsCancelled.inc({ type });
    }

    observeClaimBatchSize(size: number): void {
        this.claimBatchSize.observe(size);
    }

    incRecoveryDeadWorkers(count: number): void {
        if (count > 0) this.recoveryDeadWorkers.inc(count);
    }

    incRecoveryReclaimedFromDeadWorkers(count: number): void {
        if (count > 0) this.recoveryReclaimedFromDeadWorkers.inc(count);
    }

    incRecoveryReclaimedExpiredLeases(count: number): void {
        if (count > 0) this.recoveryReclaimedExpiredLeases.inc(count);
    }

    incPromotionPromoted(count: number): void {
        if (count > 0) this.promotionPromoted.inc(count);
    }

    metrics(): Promise<string> {
        return this.registry.metrics();
    }

    get contentType(): string {
        return this.registry.contentType;
    }
}
