import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import {
    appConfig,
    databaseConfig,
    queueConfig,
    sharedPinoHttpOptions,
    throttleConfig,
    validationSchema,
} from "./config/index.js";
import { HealthModule } from "./health/health.module.js";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { MetricsModule } from "./metrics/metrics.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { WorkersModule } from "./modules/workers/workers.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig, queueConfig, throttleConfig],
            validationSchema,
            validationOptions: { abortEarly: true },
        }),

        LoggerModule.forRoot({ pinoHttp: sharedPinoHttpOptions }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        ttl: config.getOrThrow<number>("throttle.ttlMs"),
                        limit: config.getOrThrow<number>("throttle.limit"),
                    },
                ],
            }),
        }),

        DatabaseModule,
        HealthModule,
        MetricsModule,
        WorkersModule,
        JobsModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
