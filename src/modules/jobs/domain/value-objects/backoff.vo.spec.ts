import { backoffDelaySeconds } from "./backoff.vo.js";

const params = { baseSeconds: 2, maxSeconds: 3600 };

describe("backoffDelaySeconds", () => {
    it("grows exponentially with the attempt count (mid jitter)", () => {
        const mid = () => 0.5;
        expect(backoffDelaySeconds(1, params, mid)).toBe(2); // window 2 -> [1, 2]
        expect(backoffDelaySeconds(2, params, mid)).toBe(3); // window 4 -> [2, 4]
        expect(backoffDelaySeconds(3, params, mid)).toBe(6); // window 8 -> [4, 8]
        expect(backoffDelaySeconds(4, params, mid)).toBe(12); // window 16 -> [8, 16]
    });

    it("stays within [window/2, window] for any rng value", () => {
        for (const r of [0, 0.1, 0.5, 0.9, 1]) {
            const d = backoffDelaySeconds(5, params, () => r);
            expect(d).toBeGreaterThanOrEqual(16);
            expect(d).toBeLessThanOrEqual(32);
        }
    });

    it("caps the window at maxSeconds", () => {
        const d = backoffDelaySeconds(20, { baseSeconds: 2, maxSeconds: 60 }, () => 1);
        expect(d).toBe(60);
    });
});
