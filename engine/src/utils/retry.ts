export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export async function withRetry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < policy.maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, policy.backoffMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}
