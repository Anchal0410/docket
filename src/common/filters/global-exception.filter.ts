import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../errors/app-error.js";

interface NormalizedError {
    statusCode: number;
    error: string;
    message: string;
    details?: unknown;
    traceId: string;
    timestamp: string;
}

interface DbError extends Error {
    code: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
    private readonly exposeDetails =
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "test";

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<FastifyReply>();
        const req = ctx.getRequest<FastifyRequest>();
        const traceId = req.traceId ?? "unknown";

        const normalized = this.normalize(exception, traceId);

        this.logger.error({
            ...normalized,
            stack: exception instanceof Error ? exception.stack : undefined,
            path: req.url,
            method: req.method,
        });

        res.status(normalized.statusCode).send(normalized);
    }

    private normalize(exception: unknown, traceId: string): NormalizedError {
        const base = { traceId, timestamp: new Date().toISOString() };

        if (exception instanceof AppError) {
            return {
                ...base,
                statusCode: exception.statusCode,
                error: exception.code,
                message: exception.message,
                details: this.exposeDetails ? exception.details : undefined,
            };
        }

        if (exception instanceof BadRequestException) {
            const resp = exception.getResponse() as Record<string, unknown>;
            // A class-validator failure from the global ValidationPipe always
            // carries `message` as a string[] (one entry per failed
            // constraint); a plain `new BadRequestException("text")` carries
            // a string — that's an app-level 400, not a field error.
            if (Array.isArray(resp["message"])) {
                return {
                    ...base,
                    statusCode: 400,
                    error: "VALIDATION_ERROR",
                    message: (resp["message"] as string[]).join("; "),
                };
            }
            return {
                ...base,
                statusCode: 400,
                error: "BAD_REQUEST",
                message: (resp["message"] as string) ?? exception.message,
            };
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const rawMessage =
                typeof body === "string"
                    ? body
                    : (((body as Record<string, unknown>)[
                          "message"
                      ] as string) ?? exception.message);
            const message =
                status >= 500 && !this.exposeDetails
                    ? "An unexpected error occurred"
                    : rawMessage;
            return {
                ...base,
                statusCode: status,
                error: this.httpStatusToSlug(status),
                message,
            };
        }

        if (this.isDbError(exception)) {
            return this.normalizeDbError(exception, base);
        }

        return {
            ...base,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
            details: this.exposeDetails ? String(exception) : undefined,
        };
    }

    private normalizeDbError(error: DbError, base: object): NormalizedError {
        const map: Record<
            string,
            { statusCode: number; error: string; message: string }
        > = {
            "23505": {
                statusCode: 409,
                error: "CONFLICT",
                message: "Resource already exists",
            },
            "23503": {
                statusCode: 409,
                error: "CONFLICT",
                message: "Referenced resource not found",
            },
            "23502": {
                statusCode: 400,
                error: "BAD_REQUEST",
                message: "Missing required field",
            },
            "08000": {
                statusCode: 503,
                error: "SERVICE_UNAVAILABLE",
                message: "Database unavailable",
            },
            "08006": {
                statusCode: 503,
                error: "SERVICE_UNAVAILABLE",
                message: "Database unavailable",
            },
        };
        return {
            ...base,
            ...(map[error.code] ?? {
                statusCode: 500,
                error: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
            }),
        } as NormalizedError;
    }

    private isDbError(e: unknown): e is DbError {
        return (
            e instanceof Error &&
            "code" in e &&
            typeof (e as DbError).code === "string"
        );
    }

    private httpStatusToSlug(status: number): string {
        const map: Record<number, string> = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "UNPROCESSABLE",
            429: "TOO_MANY_REQUESTS",
            500: "INTERNAL_ERROR",
            503: "SERVICE_UNAVAILABLE",
        };
        return map[status] ?? "HTTP_ERROR";
    }
}
