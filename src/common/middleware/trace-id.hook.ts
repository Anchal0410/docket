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

// Registered as a Fastify `onRequest` hook (main.ts), not a NestMiddleware:
// Nest's middleware layer runs on the raw Node req/res under Fastify, which
// isn't the object guards/interceptors/filters later see via getRequest().
// A Fastify hook runs on the same request object the whole lifecycle shares.
export function traceIdHook(
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
): void {
    req.traceId = uuidv7();
    reply.header("x-trace-id", req.traceId);
    done();
}
