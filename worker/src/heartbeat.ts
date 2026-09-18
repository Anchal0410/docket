import { BrokerClient, BrokerError } from "./broker-client.js";

type Log = (msg: string, extra?: Record<string, unknown>) => void;

export interface HeartbeatOptions {
    workerId: string;
    intervalMs: number;
    /** Called when the broker no longer knows this worker (it was reaped). */
    onNotRegistered: () => Promise<void>;
    log: Log;
}

export class Heartbeat {
    private timer?: ReturnType<typeof setInterval>;
    private beating = false;

    constructor(
        private readonly broker: BrokerClient,
        private readonly opts: HeartbeatOptions,
    ) {}

    start(): void {
        this.timer = setInterval(() => void this.beat(), this.opts.intervalMs);
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
    }

    private async beat(): Promise<void> {
        if (this.beating) return;
        this.beating = true;
        try {
            await this.broker.heartbeat(this.opts.workerId);
        } catch (err) {
            if (
                err instanceof BrokerError &&
                err.code === "WORKER_NOT_REGISTERED"
            ) {
                this.opts.log("heartbeat rejected — re-registering");
                try {
                    await this.opts.onNotRegistered();
                } catch (reErr) {
                    this.opts.log("re-register failed", { err: String(reErr) });
                }
            } else {
                this.opts.log("heartbeat failed", { err: String(err) });
            }
        } finally {
            this.beating = false;
        }
    }
}
