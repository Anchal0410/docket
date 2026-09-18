import { hostname } from "node:os";

export interface WorkerConfig {
    workerId: string;
    brokerUrl: string;
    capabilities: string[];
    concurrency: number;
    pollIntervalMs: number;
    heartbeatIntervalMs: number;
    leaseRenewMs: number;
}

function argOrEnv(flag: string, envName: string): string | undefined {
    const prefix = `--${flag}=`;
    const arg = process.argv.find((a) => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : process.env[envName];
}

export function loadConfig(): WorkerConfig {
    const capabilities = (
        argOrEnv("capabilities", "WORKER_CAPABILITIES") ?? "send_email"
    )
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

    if (capabilities.length === 0) {
        throw new Error("worker needs at least one capability");
    }

    return {
        workerId: argOrEnv("id", "WORKER_ID") ?? `worker-${hostname()}`,
        brokerUrl: argOrEnv("broker", "BROKER_URL") ?? "http://localhost:4400",
        capabilities,
        concurrency: parseInt(
            argOrEnv("concurrency", "WORKER_CONCURRENCY") ?? "1",
            10,
        ),
        pollIntervalMs: parseInt(
            process.env.WORKER_POLL_INTERVAL_MS ?? "1000",
            10,
        ),
        // Must be shorter than the broker's QUEUE_LEASE_SECONDS.
        heartbeatIntervalMs: parseInt(
            process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? "5000",
            10,
        ),
        leaseRenewMs: parseInt(
            process.env.WORKER_LEASE_RENEW_MS ?? "10000",
            10,
        ),
    };
}
