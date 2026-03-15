import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken } from "@/services/auth.service";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRequestRateLimit, createRateLimitErrorResponse } from "@/lib/rate-limit";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const TOKEN_LIFETIME_MINUTES = 15;

export async function POST(req: NextRequest) {
  const limit = checkRequestRateLimit(req, "auth:forgot-password", {
    maxRequests: 6,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return createRateLimitErrorResponse(limit.retryAfterSeconds);
  }

  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email" },
        { status: 400 }
      );
    }

    const result = await createPasswordResetToken(parsed.data.email);

    // Always return success to avoid email enumeration.
    if (result.emailSent && result.email && result.token) {
      const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
      const resetLink = `${origin}/reset-password?token=${encodeURIComponent(result.token)}`;
      await sendPasswordResetEmail(result.email, resetLink, TOKEN_LIFETIME_MINUTES);
    }

    return NextResponse.json({
      success: true,
      message: "If this email exists, a password reset link has been sent.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to process forgot password request" },
      { status: 500 }
    );
  }
}
