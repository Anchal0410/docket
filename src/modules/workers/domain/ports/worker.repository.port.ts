import type { WorkerVO } from "../value-objects/worker.vo.js";

export const WORKER_REPOSITORY = Symbol("IWorkerRepository");

export interface RegisterWorkerInput {
    workerId: string;
    capabilities: string[];
    concurrency: number;
}

export interface IWorkerRepository {
    /**
     * Insert the worker, or if `workerId` already exists, update its
     * capabilities and concurrency and mark it ONLINE with a fresh
     * heartbeat — a restarted worker re-registering must not error.
     */
    register(input: RegisterWorkerInput): Promise<WorkerVO>;

    /** Fetch a worker by id, or `null` if it is not registered. */
    findById(workerId: string): Promise<WorkerVO | null>;

    /**
     * Record a liveness ping: bump `last_heartbeat_at` and set status ONLINE
     * (so a worker that was flagged DEAD after a network blip recovers).
     * Returns `false` if no such worker row exists — the caller tells the
     * worker to re-register.
     */
    heartbeat(workerId: string): Promise<boolean>;

    /**
     * Flag every ONLINE worker whose last heartbeat is older than
     * `thresholdSeconds` as DEAD. Returns the ids flagged this pass so the
     * caller can reclaim their in-flight jobs.
     */
    markStaleWorkersDead(thresholdSeconds: number): Promise<string[]>;

    /** Remove the worker's registration. No-op if it does not exist. */
    deregister(workerId: string): Promise<void>;
}
