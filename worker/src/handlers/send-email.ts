import type { JobHandler } from "../handler-registry.js";

// Mock handler: pretends to send an email. Sleeps a beat so concurrency and
// lease behaviour are observable, then returns a result the broker stores.
export const sendEmailHandler: JobHandler = async (payload, ctx) => {
    const to = payload["to"];
    if (typeof to !== "string" || !to.includes("@")) {
        throw new Error(`invalid "to" address: ${String(to)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { deliveredTo: to, messageId: `mock-${ctx.jobId}` };
};
