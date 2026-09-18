export interface JobContext {
    jobId: string;
    attempt: number;
}

export type JobHandler = (
    payload: Record<string, unknown>,
    ctx: JobContext,
) => Promise<unknown>;

export class HandlerRegistry {
    private readonly handlers = new Map<string, JobHandler>();

    register(type: string, handler: JobHandler): void {
        this.handlers.set(type, handler);
    }

    get(type: string): JobHandler | undefined {
        return this.handlers.get(type);
    }

    types(): string[] {
        return [...this.handlers.keys()];
    }
}
