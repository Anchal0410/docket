import { Inject, Injectable } from "@nestjs/common";

import { AppError } from "#common/errors/index.js";

import {
    JOB_REPOSITORY,
    type IJobRepository,
} from "../../domain/ports/job.repository.port.js";
import type { JobVO } from "../../domain/value-objects/job.vo.js";
import type { GetJobQuery } from "./get-job.query.js";

@Injectable()
export class GetJobHandler {
    constructor(
        @Inject(JOB_REPOSITORY)
        private readonly jobs: IJobRepository,
    ) {}

    async execute(query: GetJobQuery): Promise<JobVO> {
        const job = await this.jobs.findById(query.id);
        if (!job) throw AppError.notFound("Job");
        return job;
    }
}
