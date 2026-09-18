export class FailJobCommand {
    constructor(
        public readonly jobId: string,
        public readonly workerId: string,
        public readonly error: string,
    ) {}
}
