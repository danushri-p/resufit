export const MAX_RESUME_TEXT_LENGTH = 20_000;
export const MAX_JOB_TEXT_LENGTH = 10_000;
export const AI_REQUESTS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const requestsByIp = new Map<string, RateLimitEntry>();

export function getTextLimitError(
  resumeText: string,
  jobText: string,
): string | undefined {
  if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
    return `Resume text must be ${MAX_RESUME_TEXT_LENGTH.toLocaleString()} characters or fewer.`;
  }
  if (jobText.length > MAX_JOB_TEXT_LENGTH) {
    return `Job description must be ${MAX_JOB_TEXT_LENGTH.toLocaleString()} characters or fewer.`;
  }
  return undefined;
}

// In-memory limits reset per serverless instance and are a basic safeguard only.
export function consumeAIRequest(ip: string, now = Date.now()): boolean {
  for (const [key, entry] of requestsByIp) {
    if (entry.resetAt <= now) {
      requestsByIp.delete(key);
    }
  }

  const entry = requestsByIp.get(ip);
  if (!entry || entry.resetAt <= now) {
    requestsByIp.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (entry.count >= AI_REQUESTS_PER_MINUTE) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function getRequestIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
