import type { MetricsService } from "../metrics.service.js";

/** Fully-stubbed MetricsService for handler/scheduler unit tests. */
export function makeMetricsServiceMock(
    overrides: Partial<MetricsService> = {},
): jest.Mocked<MetricsService> {
    return {
        incJobsSubmitted: jest.fn(),
        incJobsCompleted: jest.fn(),
        incJobsFailed: jest.fn(),
        incJobsDeadLettered: jest.fn(),
        incJobsCancelled: jest.fn(),
        observeClaimBatchSize: jest.fn(),
        incRecoveryDeadWorkers: jest.fn(),
        incRecoveryReclaimedFromDeadWorkers: jest.fn(),
        incRecoveryReclaimedExpiredLeases: jest.fn(),
        incPromotionPromoted: jest.fn(),
        metrics: jest.fn(),
        contentType: "text/plain",
        ...overrides,
    } as unknown as jest.Mocked<MetricsService>;
}
