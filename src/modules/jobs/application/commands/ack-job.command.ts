export class AckJobCommand {
    constructor(
        public readonly jobId: string,
        public readonly workerId: string,
        public readonly result: Record<string, unknown> | null,
    ) {}
}
