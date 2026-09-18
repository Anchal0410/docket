import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RetryDeadLetterJobCommand } from "../application/commands/retry-dead-letter-job.command.js";
import { RetryDeadLetterJobHandler } from "../application/commands/retry-dead-letter-job.handler.js";
import { ListDeadLetterJobsHandler } from "../application/queries/list-dead-letter-jobs.handler.js";
import { ListDeadLetterJobsQuery } from "../application/queries/list-dead-letter-jobs.query.js";

import {
    DeadLetterJobsResponseDto,
    ListDeadLetterJobsDto,
} from "./dead-letter-jobs.dto.js";
import { JobResponseDto } from "./jobs.dto.js";
import { toJobResponseDto } from "./jobs-http.mapper.js";

@ApiTags("Dead-letter jobs")
@Controller("dead-letter-jobs")
export class DeadLetterJobsController {
    constructor(
        private readonly listDeadLetterJobsHandler: ListDeadLetterJobsHandler,
        private readonly retryDeadLetterJobHandler: RetryDeadLetterJobHandler,
    ) {}

    @Get()
    @ApiOperation({ summary: "List dead-lettered jobs" })
    async list(
        @Query() dto: ListDeadLetterJobsDto,
    ): Promise<DeadLetterJobsResponseDto> {
        const { jobs, total } = await this.listDeadLetterJobsHandler.execute(
            new ListDeadLetterJobsQuery(dto.limit ?? 20, dto.offset ?? 0),
        );
        return { jobs: jobs.map(toJobResponseDto), total };
    }

    @Post(":id/retry")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Retry a dead-lettered job (resets attempts)" })
    async retry(
        @Param("id", ParseUUIDPipe) id: string,
    ): Promise<JobResponseDto> {
        const job = await this.retryDeadLetterJobHandler.execute(
            new RetryDeadLetterJobCommand(id),
        );
        return toJobResponseDto(job);
    }
}
