import { NextRequest, NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __apolloRateLimitStore?: Map<string, Bucket>;
};

const rateLimitStore =
  globalForRateLimit.__apolloRateLimitStore ??
  (globalForRateLimit.__apolloRateLimitStore = new Map<string, Bucket>());

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= options.maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return { allowed: true, retryAfterSeconds: 0 };
}

export function checkRequestRateLimit(
  req: NextRequest,
  prefix: string,
  options: RateLimitOptions,
  suffix?: string
): RateLimitResult {
  const ip = getClientIp(req);
  const key = suffix ? `${prefix}:${ip}:${suffix}` : `${prefix}:${ip}`;

  return consumeRateLimit(key, options);
}

export function createRateLimitErrorResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
