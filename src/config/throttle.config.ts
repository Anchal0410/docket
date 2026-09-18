import { registerAs } from "@nestjs/config";

export default registerAs("throttle", () => ({
    ttlMs: parseInt(process.env.RATE_LIMIT_TTL_MS ?? "60000", 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
}));
