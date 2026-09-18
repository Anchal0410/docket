import "../common/middleware/trace-id.hook.js"; // for the IncomingMessage.traceId augmentation
import type { Params } from "nestjs-pino";

// One options object shared by LoggerModule and (later) any process that
// wants the same log shape outside the request/response lifecycle.
export const sharedPinoHttpOptions: Params["pinoHttp"] = {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transport:
        process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
    // pino-http is wired in as Nest middleware, so under Fastify it only
    // ever sees req.raw (the IncomingMessage) -- traceIdHook stamps
    // traceId there too, specifically so this can read it.
    customProps: (req) => ({ traceId: req.traceId }),
};
