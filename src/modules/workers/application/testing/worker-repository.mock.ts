import type { IWorkerRepository } from "../../domain/ports/worker.repository.port.js";

/** Fully-stubbed IWorkerRepository for handler unit tests. Keep in sync with the port. */
export function makeWorkerRepositoryMock(
    overrides: Partial<IWorkerRepository> = {},
): jest.Mocked<IWorkerRepository> {
    return {
        register: jest.fn(),
        findById: jest.fn(),
        heartbeat: jest.fn(),
        markStaleWorkersDead: jest.fn(),
        deregister: jest.fn(),
        ...overrides,
    } as jest.Mocked<IWorkerRepository>;
}
