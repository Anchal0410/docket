import { BrokerClient, BrokerError } from "./broker-client.js";
import { Heartbeat } from "./heartbeat.js";

function makeBroker(impl: () => Promise<unknown>): BrokerClient {
    return { heartbeat: jest.fn(impl) } as unknown as BrokerClient;
}

describe("Heartbeat", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("pings on the interval and stops cleanly", async () => {
        const broker = makeBroker(() => Promise.resolve());
        const hb = new Heartbeat(broker, {
            workerId: "w1",
            intervalMs: 1000,
            onNotRegistered: jest.fn(),
            log: jest.fn(),
        });

        hb.start();
        await jest.advanceTimersByTimeAsync(3500);
        expect(broker.heartbeat).toHaveBeenCalledTimes(3);

        hb.stop();
        await jest.advanceTimersByTimeAsync(3000);
        expect(broker.heartbeat).toHaveBeenCalledTimes(3);
    });

    it("re-registers when the broker no longer knows the worker", async () => {
        const broker = makeBroker(() =>
            Promise.reject(
                new BrokerError(409, "WORKER_NOT_REGISTERED", "gone"),
            ),
        );
        const onNotRegistered = jest.fn().mockResolvedValue(undefined);
        const hb = new Heartbeat(broker, {
            workerId: "w1",
            intervalMs: 1000,
            onNotRegistered,
            log: jest.fn(),
        });

        hb.start();
        await jest.advanceTimersByTimeAsync(1000);
        expect(onNotRegistered).toHaveBeenCalledTimes(1);
        hb.stop();
    });

    it("logs and continues on a transient heartbeat failure", async () => {
        const broker = makeBroker(() =>
            Promise.reject(new Error("network down")),
        );
        const log = jest.fn();
        const onNotRegistered = jest.fn();
        const hb = new Heartbeat(broker, {
            workerId: "w1",
            intervalMs: 1000,
            onNotRegistered,
            log,
        });

        hb.start();
        await jest.advanceTimersByTimeAsync(2000);
        expect(onNotRegistered).not.toHaveBeenCalled();
        expect(log).toHaveBeenCalledWith(
            "heartbeat failed",
            expect.objectContaining({ err: expect.stringContaining("network down") }),
        );
        hb.stop();
    });
});
