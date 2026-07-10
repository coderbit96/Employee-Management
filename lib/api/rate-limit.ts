import type { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  request: NextRequest,
  keyPrefix: string,
  options = {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 60),
  },
) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || "local";
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { limited: false, remaining: options.max - 1 };
  }

  bucket.count += 1;
  return {
    limited: bucket.count > options.max,
    remaining: Math.max(0, options.max - bucket.count),
  };
}
