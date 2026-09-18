import { Inject, Injectable } from "@nestjs/common";

import { AppError } from "#common/errors/index.js";

import {
    WORKER_REPOSITORY,
    type IWorkerRepository,
} from "../../domain/ports/worker.repository.port.js";
import type { WorkerVO } from "../../domain/value-objects/worker.vo.js";
import type { RegisterWorkerCommand } from "./register-worker.command.js";

@Injectable()
export class RegisterWorkerHandler {
    constructor(
        @Inject(WORKER_REPOSITORY)
        private readonly workers: IWorkerRepository,
    ) {}

    async execute(cmd: RegisterWorkerCommand): Promise<WorkerVO> {
        if (cmd.capabilities.length === 0) {
            throw AppError.badRequest(
                "A worker must declare at least one capability.",
            );
        }
        return this.workers.register({
            workerId: cmd.workerId,
            capabilities: cmd.capabilities,
            concurrency: cmd.concurrency,
        });
    }
}
