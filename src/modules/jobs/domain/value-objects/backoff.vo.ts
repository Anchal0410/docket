export interface BackoffParams {
    baseSeconds: number;
    maxSeconds: number;
}

/**
 * Seconds to wait before the next attempt: an exponential window
 * `base * 2^(attempts-1)` capped at `maxSeconds`, then half of that window
 * plus a random amount up to the other half ("equal jitter") so a burst of
 * jobs that failed together don't all retry in the same instant.
 * e.g. base 2, attempts 3 -> 8s window -> a value in [4s, 8s].
 */
export function backoffDelaySeconds(
    attempts: number,
    { baseSeconds, maxSeconds }: BackoffParams,
    rng: () => number = Math.random,
): number {
    const window = Math.min(
        baseSeconds * 2 ** Math.max(0, attempts - 1),
        maxSeconds,
    );
    const half = window / 2;
    return Math.round(half + rng() * half);
}
