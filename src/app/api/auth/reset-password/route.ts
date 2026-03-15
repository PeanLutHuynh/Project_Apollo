import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithToken, validatePasswordResetToken } from "@/services/auth.service";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

function mapResetError(reason?: "invalid-token" | "token-expired" | "token-used" | "attempts-exceeded") {
  if (reason === "token-expired") return "Reset link has expired. Please request a new one.";
  if (reason === "token-used") return "This reset link has already been used.";
  if (reason === "attempts-exceeded") return "Too many invalid attempts. Please request a new reset link.";
  return "Invalid reset link.";
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 });
  }

  const check = await validatePasswordResetToken(token);
  if (!check.valid) {
    return NextResponse.json(
      { success: false, error: mapResetError(check.reason === "expired" ? "token-expired" : check.reason === "used" ? "token-used" : check.reason === "attempts-exceeded" ? "attempts-exceeded" : "invalid-token") },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, message: "Token is valid" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: mapResetError(result.reason) },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Password has been reset successfully." });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to reset password" },
      { status: 500 }
    );
  }
}
