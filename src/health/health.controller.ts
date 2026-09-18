import { Controller, Get } from "@nestjs/common";
import {
    HealthCheck,
    HealthCheckResult,
    HealthCheckService,
    MemoryHealthIndicator,
} from "@nestjs/terminus";

import { PrismaHealthIndicator } from "./prisma-health.indicator.js";

@Controller("health")
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly memory: MemoryHealthIndicator,
        private readonly db: PrismaHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    check(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
            () => this.db.isHealthy("database"),
        ]);
    }
}
