export class RetryDeadLetterJobCommand {
    constructor(public readonly jobId: string) {}
}
