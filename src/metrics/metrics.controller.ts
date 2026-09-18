import { Controller, Get, Res } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";

import { MetricsService } from "./metrics.service.js";

// Prometheus needs the raw exposition-format text, not the JSON envelope
// TransformInterceptor wraps every other response in -- so this bypasses
// the normal response pipeline via @Res() and writes the body directly.
@SkipThrottle() // scraped continuously by Prometheus, not producer traffic
@Controller("metrics")
export class MetricsController {
    constructor(private readonly metrics: MetricsService) {}

    @Get()
    @ApiExcludeEndpoint()
    async get(@Res() reply: FastifyReply): Promise<void> {
        const body = await this.metrics.metrics();
        reply.header("content-type", this.metrics.contentType).send(body);
    }
}
