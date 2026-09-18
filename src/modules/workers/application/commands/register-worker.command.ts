export class RegisterWorkerCommand {
    constructor(
        public readonly workerId: string,
        public readonly capabilities: string[],
        public readonly concurrency: number,
    ) {}
}
