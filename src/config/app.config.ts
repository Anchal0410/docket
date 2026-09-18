import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
    env: process.env.NODE_ENV ?? "development",
    port: parseInt(process.env.PORT ?? "3000", 10),
    isSwaggerEnabled: process.env.SWAGGER_ENABLED === "true",
    // Comma-separated allowed origins for browser CORS (e.g. a hosted demo
    // page). Unset means no cross-origin browser access -- fine for local/
    // worker-to-broker use, since those aren't browser requests anyway.
    corsOrigins: (process.env.CORS_ORIGINS ?? "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
}));
