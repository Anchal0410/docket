import { loadConfig } from "./config.js";

describe("loadConfig", () => {
    const origArgv = process.argv;
    const origEnv = process.env;

    beforeEach(() => {
        process.argv = ["node", "main.js"];
        process.env = { ...origEnv };
        for (const k of [
            "WORKER_ID",
            "WORKER_CAPABILITIES",
            "WORKER_CONCURRENCY",
            "BROKER_URL",
        ]) {
            delete process.env[k];
        }
    });

    afterEach(() => {
        process.argv = origArgv;
        process.env = origEnv;
    });

    it("applies defaults", () => {
        const c = loadConfig();
        expect(c.capabilities).toEqual(["send_email"]);
        expect(c.concurrency).toBe(1);
        expect(c.workerId).toMatch(/^worker-/);
        expect(c.brokerUrl).toBe("http://localhost:4400");
    });

    it("reads env vars and splits capabilities", () => {
        process.env.WORKER_CAPABILITIES = "send_email, generate_report";
        process.env.WORKER_CONCURRENCY = "5";
        const c = loadConfig();
        expect(c.capabilities).toEqual(["send_email", "generate_report"]);
        expect(c.concurrency).toBe(5);
    });

    it("lets CLI flags override env", () => {
        process.env.WORKER_CONCURRENCY = "5";
        process.argv = ["node", "main.js", "--concurrency=9", "--id=w-cli"];
        const c = loadConfig();
        expect(c.concurrency).toBe(9);
        expect(c.workerId).toBe("w-cli");
    });
});
