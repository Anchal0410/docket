import { Inject, Injectable } from "@nestjs/common";

import {
    WORKER_REPOSITORY,
    type IWorkerRepository,
} from "../../domain/ports/worker.repository.port.js";
import type { DeregisterWorkerCommand } from "./deregister-worker.command.js";

@Injectable()
export class DeregisterWorkerHandler {
    constructor(
        @Inject(WORKER_REPOSITORY)
        private readonly workers: IWorkerRepository,
    ) {}

    execute(cmd: DeregisterWorkerCommand): Promise<void> {
        return this.workers.deregister(cmd.workerId);
    }
}
