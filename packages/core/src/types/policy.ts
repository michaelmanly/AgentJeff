export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export interface TimeoutPolicy {
  stepTimeoutMs: number;
  totalTimeoutMs: number;
}

export interface ExecutionPolicy {
  retry?: RetryPolicy;
  timeout?: TimeoutPolicy;
  maxSteps?: number;
}
