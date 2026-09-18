export type WorkerStatus = "ONLINE" | "DEAD";

export interface WorkerVO {
    workerId: string;
    capabilities: string[];
    concurrency: number;
    status: WorkerStatus;
    currentJobCount: number;
    registeredAt: Date;
    lastHeartbeatAt: Date;
}
