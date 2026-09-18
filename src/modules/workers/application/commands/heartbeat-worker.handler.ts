import { Inject, Injectable } from "@nestjs/common";

import { AppError } from "#common/errors/index.js";

import {
    WORKER_REPOSITORY,
    type IWorkerRepository,
} from "../../domain/ports/worker.repository.port.js";
import type { HeartbeatWorkerCommand } from "./heartbeat-worker.command.js";

@Injectable()
export class HeartbeatWorkerHandler {
    constructor(
        @Inject(WORKER_REPOSITORY)
        private readonly workers: IWorkerRepository,
    ) {}

    async execute(cmd: HeartbeatWorkerCommand): Promise<void> {
        const known = await this.workers.heartbeat(cmd.workerId);
        if (!known) {
            throw new AppError(
                "WORKER_NOT_REGISTERED",
                409,
                "Unknown worker — register before sending heartbeats.",
            );
        }
    }
}
