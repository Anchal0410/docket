import type { JobHandler } from "../handler-registry.js";

// Mock handler: pretends to build a report. Sleeps longer than send_email so
// a mixed fleet shows capability routing and uneven job durations.
export const generateReportHandler: JobHandler = async (payload, ctx) => {
    const range = payload["range"];
    if (typeof range !== "string") {
        throw new Error(`"range" must be a string, got ${typeof range}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { reportId: `rpt-${ctx.jobId}`, range, rows: 42 };
};
