import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AckJobCommand } from "../application/commands/ack-job.command.js";
import { AckJobHandler } from "../application/commands/ack-job.handler.js";
import { ClaimJobsCommand } from "../application/commands/claim-jobs.command.js";
import { ClaimJobsHandler } from "../application/commands/claim-jobs.handler.js";
import { FailJobCommand } from "../application/commands/fail-job.command.js";
import { FailJobHandler } from "../application/commands/fail-job.handler.js";
import { RenewLeaseCommand } from "../application/commands/renew-lease.command.js";
import { RenewLeaseHandler } from "../application/commands/renew-lease.handler.js";
import { SubmitJobCommand } from "../application/commands/submit-job.command.js";
import { SubmitJobHandler } from "../application/commands/submit-job.handler.js";
import { GetJobHandler } from "../application/queries/get-job.handler.js";
import { GetJobQuery } from "../application/queries/get-job.query.js";

import {
    AckJobDto,
    ClaimJobsDto,
    FailJobDto,
    JobResponseDto,
    RenewLeaseDto,
    SubmitJobDto,
} from "./jobs.dto.js";
import { toJobResponseDto } from "./jobs-http.mapper.js";

@ApiTags("Jobs")
@Controller("jobs")
export class JobsController {
    constructor(
        private readonly submitJobHandler: SubmitJobHandler,
        private readonly getJobHandler: GetJobHandler,
        private readonly claimJobsHandler: ClaimJobsHandler,
        private readonly ackJobHandler: AckJobHandler,
        private readonly failJobHandler: FailJobHandler,
        private readonly renewLeaseHandler: RenewLeaseHandler,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: "Submit a job" })
    async submit(@Body() dto: SubmitJobDto): Promise<JobResponseDto> {
        const job = await this.submitJobHandler.execute(
            new SubmitJobCommand(
                dto.type,
                dto.payload,
                dto.priority ?? 1,
                this.resolveRunAt(dto),
                dto.maxAttempts ?? 5,
                dto.idempotencyKey,
            ),
        );
        return toJobResponseDto(job);
    }

    @Post("claim")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Claim a batch of queued jobs (worker)" })
    async claim(@Body() dto: ClaimJobsDto): Promise<JobResponseDto[]> {
        const jobs = await this.claimJobsHandler.execute(
            new ClaimJobsCommand(dto.workerId, dto.batchSize ?? 1),
        );
        return jobs.map(toJobResponseDto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a job by id" })
    async get(@Param("id", ParseUUIDPipe) id: string): Promise<JobResponseDto> {
        const job = await this.getJobHandler.execute(new GetJobQuery(id));
        return toJobResponseDto(job);
    }

    @Post(":id/ack")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Acknowledge a job as completed (worker)" })
    async ack(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: AckJobDto,
    ): Promise<JobResponseDto> {
        const job = await this.ackJobHandler.execute(
            new AckJobCommand(id, dto.workerId, dto.result ?? null),
        );
        return toJobResponseDto(job);
    }

    @Post(":id/fail")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Report a job as failed (worker)" })
    async fail(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: FailJobDto,
    ): Promise<JobResponseDto> {
        const job = await this.failJobHandler.execute(
            new FailJobCommand(id, dto.workerId, dto.error),
        );
        return toJobResponseDto(job);
    }

    @Post(":id/lease/renew")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Extend a job's lease (worker, long handler)" })
    async renewLease(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: RenewLeaseDto,
    ): Promise<JobResponseDto> {
        const job = await this.renewLeaseHandler.execute(
            new RenewLeaseCommand(id, dto.workerId),
        );
        return toJobResponseDto(job);
    }

    private resolveRunAt(dto: SubmitJobDto): Date {
        if (dto.runAt) return new Date(dto.runAt);
        if (dto.delay) return new Date(Date.now() + dto.delay * 1000);
        return new Date();
    }
}
