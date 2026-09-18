import fastifyCompress from "@fastify/compress";
import fastifyHelmet from "@fastify/helmet";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
    FastifyAdapter,
    NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module.js";
import { GlobalExceptionFilter } from "./common/filters/index.js";
import { TransformInterceptor } from "./common/interceptors/index.js";
import { traceIdHook } from "./common/middleware/trace-id.hook.js";
import { globalValidationPipe } from "./common/pipes/index.js";

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
        { bufferLogs: true },
    );

    app.useLogger(app.get(Logger));

    const config = app.get(ConfigService);

    const corsOrigins = config.get<string[]>("app.corsOrigins") ?? [];
    if (corsOrigins.length > 0) {
        app.enableCors({ origin: corsOrigins });
    }

    app.getHttpAdapter().getInstance().addHook("onRequest", traceIdHook);

    await app.register(fastifyHelmet);
    await app.register(fastifyCompress);

    app.useGlobalPipes(globalValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    if (config.get<boolean>("app.isSwaggerEnabled")) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle("Docket API")
            .setDescription("Distributed job queue broker")
            .setVersion(process.env.npm_package_version ?? "0.0.0")
            .build();

        SwaggerModule.setup(
            "docs",
            app,
            SwaggerModule.createDocument(app, swaggerConfig),
        );
    }

    app.enableShutdownHooks();

    const port = config.get<number>("app.port") ?? 3000;
    await app.listen(port, "0.0.0.0");

    app.get(Logger).log(
        `Docket broker running on http://localhost:${port}`,
        "Bootstrap",
    );
}

void bootstrap();
