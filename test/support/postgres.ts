import { execSync } from "node:child_process";

import { PrismaPg } from "@prisma/adapter-pg";
import {
    PostgreSqlContainer,
    type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";

import { PrismaClient } from "#db";

export interface TestDb {
    prisma: PrismaClient;
    container: StartedPostgreSqlContainer;
    stop: () => Promise<void>;
}

/**
 * Spin up a throwaway Postgres in Docker, apply the migrations, and hand back
 * a connected Prisma client. Used by *.int-spec.ts to exercise raw SQL
 * (SKIP LOCKED, guards) that a mocked client can't cover.
 */
export async function startTestDb(): Promise<TestDb> {
    const container = await new PostgreSqlContainer(
        "postgres:16-alpine",
    ).start();
    const url = container.getConnectionUri();

    execSync("pnpm prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: url },
        stdio: "inherit",
    });

    const pool = new Pool({ connectionString: url });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    return {
        prisma,
        container,
        stop: async () => {
            await prisma.$disconnect();
            await pool.end();
            await container.stop();
        },
    };
}
