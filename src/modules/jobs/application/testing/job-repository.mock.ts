import type { IJobRepository } from "../../domain/ports/job.repository.port.js";

/** Fully-stubbed IJobRepository for handler unit tests. Keep in sync with the port. */
export function makeJobRepositoryMock(
    overrides: Partial<IJobRepository> = {},
): jest.Mocked<IJobRepository> {
    return {
        submit: jest.fn(),
        findById: jest.fn(),
        claim: jest.fn(),
        ack: jest.fn(),
        fail: jest.fn(),
        renewLease: jest.fn(),
        reclaimFromDeadWorkers: jest.fn(),
        reclaimExpiredLeases: jest.fn(),
        promotePendingJobs: jest.fn(),
        listDeadLetter: jest.fn(),
        retryDeadLetterJob: jest.fn(),
        cancel: jest.fn(),
        countBacklog: jest.fn(),
        ...overrides,
    } as jest.Mocked<IJobRepository>;
}
