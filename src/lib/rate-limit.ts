export interface RateLimiterOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface RateLimiterResponse {
  remaining: number;
  reset: number;
}

export function rateLimit(options: RateLimiterOptions) {
  const tokenCache = new Map<string, number[]>();

  return {
    check: async (
      limit: number,
      token: string
    ): Promise<RateLimiterResponse> => {
      const now = Date.now();
      const windowStart = now - options.interval;

      const tokenKey = `${token}_${Math.floor(now / options.interval)}`;

      const timestamps = tokenCache.get(tokenKey) || [];
      const validTimestamps = timestamps.filter(
        (timestamp) => timestamp > windowStart
      );

      if (validTimestamps.length >= limit) {
        const oldestTimestamp = validTimestamps[0];
        const reset = oldestTimestamp + options.interval;

        return {
          remaining: 0,
          reset,
        };
      }

      validTimestamps.push(now);
      tokenCache.set(tokenKey, validTimestamps);

      // Cleanup old entries
      for (const [key, value] of tokenCache.entries()) {
        if (key.startsWith(token) && key !== tokenKey) {
          tokenCache.delete(key);
        }
      }

      return {
        remaining: limit - validTimestamps.length,
        reset: now + options.interval,
      };
    },
  };
}
