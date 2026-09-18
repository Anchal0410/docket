import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";

import {
    appConfig,
    databaseConfig,
    queueConfig,
    sharedPinoHttpOptions,
    validationSchema,
} from "./config/index.js";
import { HealthModule } from "./health/health.module.js";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { WorkersModule } from "./modules/workers/workers.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig, queueConfig],
            validationSchema,
            validationOptions: { abortEarly: true },
        }),

        LoggerModule.forRoot({ pinoHttp: sharedPinoHttpOptions }),
        ScheduleModule.forRoot(),

        DatabaseModule,
        HealthModule,
        WorkersModule,
        JobsModule,
    ],
})
export class AppModule {}
