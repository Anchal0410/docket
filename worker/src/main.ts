import { BrokerClient } from "./broker-client.js";
import { loadConfig } from "./config.js";
import { HandlerRegistry } from "./handler-registry.js";
import { generateReportHandler } from "./handlers/generate-report.js";
import { sendEmailHandler } from "./handlers/send-email.js";
import { Heartbeat } from "./heartbeat.js";
import { Runner } from "./runner.js";

async function withRetry<T>(
    fn: () => Promise<T>,
    opts: { attempts: number; delayMs: number; onRetry: (err: string) => void },
): Promise<T> {
    for (let i = 1; ; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i >= opts.attempts) throw err;
            opts.onRetry(err instanceof Error ? err.message : String(err));
            await new Promise((r) => setTimeout(r, opts.delayMs));
        }
    }
}

async function loadDotenvIfPresent(): Promise<void> {
    try {
        // Local-dev convenience. The production image is configured straight
        // from the environment and has no dotenv installed.
        (await import("dotenv")).config();
    } catch {
        /* dotenv absent — use the real environment */
    }
}

async function main(): Promise<void> {
    await loadDotenvIfPresent();
    const config = loadConfig();
    const log = (msg: string, extra: Record<string, unknown> = {}): void => {
        console.log(
            JSON.stringify({
                ts: new Date().toISOString(),
                workerId: config.workerId,
                msg,
                ...extra,
            }),
        );
    };

    const broker = new BrokerClient(config.brokerUrl);
    const registry = new HandlerRegistry();
    registry.register("send_email", sendEmailHandler);
    registry.register("generate_report", generateReportHandler);

    const unhandled = config.capabilities.filter((c) => !registry.get(c));
    if (unhandled.length > 0) {
        throw new Error(
            `declared capabilities with no registered handler: ${unhandled.join(", ")}`,
        );
    }

    const register = (): Promise<unknown> =>
        broker.register({
            workerId: config.workerId,
            capabilities: config.capabilities,
            concurrency: config.concurrency,
        });

    await withRetry(register, {
        attempts: 30,
        delayMs: 1000,
        onRetry: (err) => log("waiting for broker", { err }),
    });
    log("registered", {
        capabilities: config.capabilities,
        concurrency: config.concurrency,
        brokerUrl: config.brokerUrl,
    });

    const heartbeat = new Heartbeat(broker, {
        workerId: config.workerId,
        intervalMs: config.heartbeatIntervalMs,
        onNotRegistered: async () => {
            await register();
        },
        log,
    });
    heartbeat.start();

    const runner = new Runner(broker, registry, {
        workerId: config.workerId,
        concurrency: config.concurrency,
        pollIntervalMs: config.pollIntervalMs,
        leaseRenewMs: config.leaseRenewMs,
        log,
    });

    let shuttingDown = false;
    const shutdown = async (signal: string): Promise<void> => {
        if (shuttingDown) return;
        shuttingDown = true;
        log("shutting down", { signal });
        heartbeat.stop();
        await runner.drain();
        try {
            await broker.deregister(config.workerId);
        } catch (err) {
            log("deregister failed", { err: String(err) });
        }
        process.exit(0);
    };
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));

    await runner.start();
}

void main().catch((err) => {
    console.error(err);
    process.exit(1);
});
