import { Inject, Injectable } from "@nestjs/common";

import {
    JOB_REPOSITORY,
    type IJobRepository,
    type ListDeadLetterJobsResult,
} from "../../domain/ports/job.repository.port.js";
import type { ListDeadLetterJobsQuery } from "./list-dead-letter-jobs.query.js";

@Injectable()
export class ListDeadLetterJobsHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
    ) {}

    execute(query: ListDeadLetterJobsQuery): Promise<ListDeadLetterJobsResult> {
        return this.jobs.listDeadLetter({
            limit: query.limit,
            offset: query.offset,
        });
    }
}
