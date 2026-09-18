export type JobStatus =
    | "PENDING"
    | "QUEUED"
    | "PROCESSING"
    | "COMPLETED"
    | "DEAD_LETTER"
    | "CANCELLED";

// CANCELLED is a terminal status (set directly for a PENDING/QUEUED job).
// cancelRequested is a best-effort flag for a PROCESSING job: recorded for
// visibility, but nothing currently forces a running handler to stop.

// 0 = LOW, 1 = MEDIUM, 2 = HIGH
export type JobPriority = 0 | 1 | 2;

export interface JobVO {
    id: string;
    idempotencyKey: string | null;
    type: string;
    payload: Record<string, unknown>;
    priority: JobPriority;
    status: JobStatus;
    cancelRequested: boolean;
    runAt: Date;
    attempts: number;
    maxAttempts: number;
    lastError: string | null;
    result: Record<string, unknown> | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}
