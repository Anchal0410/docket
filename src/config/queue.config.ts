import { registerAs } from "@nestjs/config";

export default registerAs("queue", () => ({
    leaseSeconds: parseInt(process.env.QUEUE_LEASE_SECONDS ?? "30", 10),
    claimMaxBatch: parseInt(process.env.QUEUE_CLAIM_MAX_BATCH ?? "10", 10),
    backoffBaseSeconds: parseInt(
        process.env.QUEUE_BACKOFF_BASE_SECONDS ?? "2",
        10,
    ),
    backoffMaxSeconds: parseInt(
        process.env.QUEUE_BACKOFF_MAX_SECONDS ?? "3600",
        10,
    ),
    deadWorkerThresholdSeconds: parseInt(
        process.env.QUEUE_DEAD_WORKER_THRESHOLD_SECONDS ?? "15",
        10,
    ),
    recoveryIntervalMs: parseInt(
        process.env.QUEUE_RECOVERY_INTERVAL_MS ?? "5000",
        10,
    ),
    promotionIntervalMs: parseInt(
        process.env.QUEUE_PROMOTION_INTERVAL_MS ?? "1000",
        10,
    ),
    // Fleet-wide cap on simultaneous PROCESSING jobs, per type. Types not
    // listed here are unrestricted. e.g. {"send_email":5}.
    typeConcurrencyLimits: JSON.parse(
        process.env.QUEUE_TYPE_CONCURRENCY_LIMITS ?? "{}",
    ) as Record<string, number>,
}));
