import type { JobVO } from "../domain/value-objects/job.vo.js";
import type { JobResponseDto } from "./jobs.dto.js";

export function toJobResponseDto(job: JobVO): JobResponseDto {
    return {
        id: job.id,
        type: job.type,
        payload: job.payload,
        priority: job.priority,
        status: job.status,
        cancelRequested: job.cancelRequested,
        runAt: job.runAt.toISOString(),
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lastError: job.lastError,
        result: job.result,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
    };
}
