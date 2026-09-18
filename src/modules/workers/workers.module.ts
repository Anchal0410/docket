import { Module } from "@nestjs/common";

import { DeregisterWorkerHandler } from "./application/commands/deregister-worker.handler.js";
import { HeartbeatWorkerHandler } from "./application/commands/heartbeat-worker.handler.js";
import { RegisterWorkerHandler } from "./application/commands/register-worker.handler.js";
import { WORKER_REPOSITORY } from "./domain/ports/worker.repository.port.js";
import { WorkersController } from "./http/workers.controller.js";
import { PrismaWorkerRepository } from "./infrastructure/repositories/prisma-worker.repository.js";

@Module({
    controllers: [WorkersController],
    providers: [
        RegisterWorkerHandler,
        DeregisterWorkerHandler,
        HeartbeatWorkerHandler,
        { provide: WORKER_REPOSITORY, useClass: PrismaWorkerRepository },
    ],
    exports: [WORKER_REPOSITORY],
})
export class WorkersModule {}
