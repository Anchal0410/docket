export class ClaimJobsCommand {
    constructor(
        public readonly workerId: string,
        public readonly batchSize: number,
    ) {}
}
