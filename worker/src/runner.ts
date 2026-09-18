import type { BrokerClient, ClaimedJob } from "./broker-client.js";
import type { HandlerRegistry } from "./handler-registry.js";

type Log = (msg: string, extra?: Record<string, unknown>) => void;

export interface RunnerOptions {
    workerId: string;
    concurrency: number;
    pollIntervalMs: number;
    leaseRenewMs: number;
    log: Log;
}

export class Runner {
    private running = false;
    private inFlight = 0;

    constructor(
        private readonly broker: BrokerClient,
        private readonly registry: HandlerRegistry,
        private readonly opts: RunnerOptions,
    ) {}

    async start(): Promise<void> {
        this.running = true;
        while (this.running) {
            const free = this.opts.concurrency - this.inFlight;
            if (free <= 0) {
                await sleep(25);
                continue;
            }

            let jobs: ClaimedJob[];
            try {
                jobs = await this.broker.claim(this.opts.workerId, free);
            } catch (err) {
                this.opts.log("claim failed", { err: String(err) });
                await sleep(this.opts.pollIntervalMs);
                continue;
            }

            if (jobs.length === 0) {
                await sleep(this.opts.pollIntervalMs);
                continue;
            }

            for (const job of jobs) void this.process(job);
        }
    }

    /** Stop claiming and wait for in-flight handlers to finish. */
    async drain(): Promise<void> {
        this.running = false;
        while (this.inFlight > 0) await sleep(50);
    }

    private async process(job: ClaimedJob): Promise<void> {
        this.inFlight++;
        try {
            const handler = this.registry.get(job.type);
            if (!handler) {
                await this.broker.fail(
                    job.id,
                    this.opts.workerId,
                    `no handler registered for type "${job.type}"`,
                );
                return;
            }

            // Keep the lease alive for a handler that runs longer than it.
            const renew = setInterval(() => {
                void this.broker
                    .renewLease(job.id, this.opts.workerId)
                    .catch((err: unknown) =>
                        this.opts.log("lease renew failed", {
                            jobId: job.id,
                            err: String(err),
                        }),
                    );
            }, this.opts.leaseRenewMs);

            let result: unknown;
            try {
                result = await handler(job.payload, {
                    jobId: job.id,
                    attempt: job.attempts,
                });
            } finally {
                clearInterval(renew);
            }

            await this.broker.ack(job.id, this.opts.workerId, result ?? null);
            this.opts.log("job completed", { jobId: job.id, type: job.type });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            try {
                await this.broker.fail(job.id, this.opts.workerId, message);
                this.opts.log("job failed", {
                    jobId: job.id,
                    type: job.type,
                    error: message,
                });
            } catch (reportErr) {
                this.opts.log("could not report failure", {
                    jobId: job.id,
                    err: String(reportErr),
                });
            }
        } finally {
            this.inFlight--;
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
