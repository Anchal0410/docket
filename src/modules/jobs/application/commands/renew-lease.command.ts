export class RenewLeaseCommand {
    constructor(
        public readonly jobId: string,
        public readonly workerId: string,
    ) {}
}
