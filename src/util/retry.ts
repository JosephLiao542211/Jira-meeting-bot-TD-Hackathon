import { log } from "./index.js";

export interface RetryOptions {
  /** Max number of attempts (including the first). Default 3. */
  maxAttempts?: number;
  /** Initial delay in ms before the first retry. Default 1000. */
  baseDelayMs?: number;
  /** Maximum delay cap in ms. Default 30000. */
  maxDelayMs?: number;
  /** Multiplier applied to delay after each retry. Default 2. */
  factor?: number;
  /** Tag used in log output. Default "retry". */
  tag?: string;
  /** If true, errors on final attempt are swallowed and `fallback` is returned. Default true. */
  swallow?: boolean;
}

const DEFAULTS: Required<Omit<RetryOptions, "tag" | "swallow">> = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  factor: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Retry an async function with exponential backoff.
 *
 * Returns the function result on success, or `fallback` if all attempts fail
 * and `swallow` is true (default). If `swallow` is false the final error is
 * re-thrown.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  fallback: T,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? DEFAULTS.maxAttempts;
  const baseDelay = opts.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const maxDelay = opts.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const factor = opts.factor ?? DEFAULTS.factor;
  const tag = opts.tag ?? "retry";
  const swallow = opts.swallow ?? true;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message ?? String(err);

      if (attempt === maxAttempts) {
        log(tag, `attempt ${attempt}/${maxAttempts} failed (final): ${msg}`, "red");
        break;
      }

      const delay = Math.min(baseDelay * factor ** (attempt - 1), maxDelay);
      log(tag, `attempt ${attempt}/${maxAttempts} failed: ${msg} — retrying in ${delay}ms`, "yellow");
      await sleep(delay);
    }
  }

  if (!swallow) throw lastErr;
  log(tag, "all attempts exhausted — returning fallback", "red");
  return fallback;
}
