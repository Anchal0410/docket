import type {
    FastifyReply,
    FastifyRequest,
    HookHandlerDoneFunction,
} from "fastify";
import { uuidv7 } from "uuidv7";

declare module "fastify" {
    interface FastifyRequest {
        traceId: string;
    }
}

declare module "http" {
    interface IncomingMessage {
        traceId?: string;
    }
}

// Registered as a Fastify `onRequest` hook (main.ts), not a NestMiddleware:
// Nest's middleware layer runs on the raw Node req/res under Fastify, which
// isn't the object guards/interceptors/filters later see via getRequest().
// A Fastify hook runs on the same request object the whole lifecycle shares.
//
// Also stamped onto req.raw (the underlying IncomingMessage): pino-http is
// wired in as Nest middleware (nestjs-pino's LoggerModule.configure uses
// MiddlewareConsumer), so under Fastify it only ever sees req.raw, never
// the FastifyRequest wrapper this hook otherwise sets traceId on -- without
// this, pino.options.ts's customProps would always read undefined.
export function traceIdHook(
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
): void {
    req.traceId = uuidv7();
    req.raw.traceId = req.traceId;
    reply.header("x-trace-id", req.traceId);
    done();
}
