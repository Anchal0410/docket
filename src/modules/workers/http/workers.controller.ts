import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { DeregisterWorkerCommand } from "../application/commands/deregister-worker.command.js";
import { DeregisterWorkerHandler } from "../application/commands/deregister-worker.handler.js";
import { HeartbeatWorkerCommand } from "../application/commands/heartbeat-worker.command.js";
import { HeartbeatWorkerHandler } from "../application/commands/heartbeat-worker.handler.js";
import { RegisterWorkerCommand } from "../application/commands/register-worker.command.js";
import { RegisterWorkerHandler } from "../application/commands/register-worker.handler.js";

import { RegisterWorkerDto, WorkerResponseDto } from "./workers.dto.js";
import { toWorkerResponseDto } from "./workers-http.mapper.js";

@ApiTags("Workers")
@Controller("workers")
export class WorkersController {
    constructor(
        private readonly registerWorkerHandler: RegisterWorkerHandler,
        private readonly deregisterWorkerHandler: DeregisterWorkerHandler,
        private readonly heartbeatWorkerHandler: HeartbeatWorkerHandler,
    ) {}

    @Post("register")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Register a worker (idempotent on workerId)" })
    async register(@Body() dto: RegisterWorkerDto): Promise<WorkerResponseDto> {
        const worker = await this.registerWorkerHandler.execute(
            new RegisterWorkerCommand(
                dto.workerId,
                dto.capabilities,
                dto.concurrency ?? 1,
            ),
        );
        return toWorkerResponseDto(worker);
    }

    @Post(":id/heartbeat")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Worker liveness ping" })
    async heartbeat(@Param("id") id: string): Promise<void> {
        await this.heartbeatWorkerHandler.execute(
            new HeartbeatWorkerCommand(id),
        );
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Deregister a worker" })
    async deregister(@Param("id") id: string): Promise<void> {
        await this.deregisterWorkerHandler.execute(
            new DeregisterWorkerCommand(id),
        );
    }
}
