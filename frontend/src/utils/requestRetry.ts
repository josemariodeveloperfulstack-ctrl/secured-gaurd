import { isRetryableConnectionError } from './connectionError';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withConnectionRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isRetryableConnectionError(error)) {
        await sleep(baseDelayMs * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
