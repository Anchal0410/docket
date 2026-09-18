import type { Params } from "nestjs-pino";

// One options object shared by LoggerModule and (later) any process that
// wants the same log shape outside the request/response lifecycle.
export const sharedPinoHttpOptions: Params["pinoHttp"] = {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transport:
        process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
};
