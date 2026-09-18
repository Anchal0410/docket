import type { JobPriority } from "../../domain/value-objects/job.vo.js";

export class SubmitJobCommand {
    constructor(
        public readonly type: string,
        public readonly payload: Record<string, unknown>,
        public readonly priority: JobPriority = 1,
        public readonly runAt: Date = new Date(),
        public readonly maxAttempts: number = 5,
        public readonly idempotencyKey?: string,
    ) {}
}
