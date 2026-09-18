export class ListDeadLetterJobsQuery {
    constructor(
        public readonly limit: number,
        public readonly offset: number,
    ) {}
}
