import type { WorkerVO } from "../domain/value-objects/worker.vo.js";
import type { WorkerResponseDto } from "./workers.dto.js";

export function toWorkerResponseDto(worker: WorkerVO): WorkerResponseDto {
    return {
        workerId: worker.workerId,
        capabilities: worker.capabilities,
        concurrency: worker.concurrency,
        status: worker.status,
        currentJobCount: worker.currentJobCount,
        registeredAt: worker.registeredAt.toISOString(),
        lastHeartbeatAt: worker.lastHeartbeatAt.toISOString(),
    };
}
