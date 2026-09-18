export interface ClaimedJob {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    attempts: number;
    maxAttempts: number;
}

interface Envelope<T> {
    success: boolean;
    data: T;
}

export class BrokerError extends Error {
    constructor(
        readonly status: number,
        readonly code: string | undefined,
        message: string,
    ) {
        super(message);
        this.name = "BrokerError";
    }
}

export class BrokerClient {
    constructor(private readonly baseUrl: string) {}

    register(body: {
        workerId: string;
        capabilities: string[];
        concurrency: number;
    }): Promise<unknown> {
        return this.request("POST", "/workers/register", body);
    }

    heartbeat(workerId: string): Promise<unknown> {
        return this.request(
            "POST",
            `/workers/${encodeURIComponent(workerId)}/heartbeat`,
        );
    }

    deregister(workerId: string): Promise<unknown> {
        return this.request(
            "DELETE",
            `/workers/${encodeURIComponent(workerId)}`,
        );
    }

    async claim(workerId: string, batchSize: number): Promise<ClaimedJob[]> {
        const res = (await this.request("POST", "/jobs/claim", {
            workerId,
            batchSize,
        })) as Envelope<ClaimedJob[]>;
        return res.data;
    }

    ack(jobId: string, workerId: string, result: unknown): Promise<unknown> {
        return this.request("POST", `/jobs/${jobId}/ack`, { workerId, result });
    }

    fail(jobId: string, workerId: string, error: string): Promise<unknown> {
        return this.request("POST", `/jobs/${jobId}/fail`, { workerId, error });
    }

    renewLease(jobId: string, workerId: string): Promise<unknown> {
        return this.request("POST", `/jobs/${jobId}/lease/renew`, { workerId });
    }

    private async request(
        method: string,
        path: string,
        body?: unknown,
    ): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: body ? { "content-type": "application/json" } : undefined,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text();
            let code: string | undefined;
            try {
                code = (JSON.parse(text) as { error?: string }).error;
            } catch {
                /* non-JSON error body */
            }
            throw new BrokerError(
                res.status,
                code,
                `${method} ${path} -> ${res.status}: ${text}`,
            );
        }
        return res.status === 204 ? undefined : await res.json();
    }
}
