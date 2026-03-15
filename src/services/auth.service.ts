import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const RESET_TOKEN_TTL_MINUTES = 15;
const MAX_RESET_ATTEMPTS = 5;

function createResetTokenValue(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(email: string): Promise<{
  emailSent: boolean;
  email?: string;
  token?: string;
  expiresAt?: Date;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return { emailSent: false };
  }

  const token = createResetTokenValue();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  // Revoke previous unused reset tokens before issuing a new one.
  await db.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    emailSent: true,
    email: user.email,
    token,
    expiresAt,
  };
}

export async function validatePasswordResetToken(token: string): Promise<{
  valid: boolean;
  reason?: "not-found" | "expired" | "used" | "attempts-exceeded";
  recordId?: string;
  userId?: string;
}> {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      attempts: true,
    },
  });

  if (!resetToken) {
    return { valid: false, reason: "not-found" };
  }

  if (resetToken.usedAt) {
    return { valid: false, reason: "used", recordId: resetToken.id, userId: resetToken.userId };
  }

  if (resetToken.attempts >= MAX_RESET_ATTEMPTS) {
    return { valid: false, reason: "attempts-exceeded", recordId: resetToken.id, userId: resetToken.userId };
  }

  if (resetToken.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "expired", recordId: resetToken.id, userId: resetToken.userId };
  }

  return { valid: true, recordId: resetToken.id, userId: resetToken.userId };
}

export async function increasePasswordResetAttempt(recordId: string): Promise<void> {
  await db.passwordResetToken.update({
    where: { id: recordId },
    data: { attempts: { increment: 1 } },
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{
  success: boolean;
  reason?: "invalid-token" | "token-expired" | "token-used" | "attempts-exceeded";
}> {
  const check = await validatePasswordResetToken(token);

  if (!check.valid) {
    if (check.recordId) {
      await increasePasswordResetAttempt(check.recordId);
    }

    const mappedReason =
      check.reason === "expired"
        ? "token-expired"
        : check.reason === "used"
          ? "token-used"
          : check.reason === "attempts-exceeded"
            ? "attempts-exceeded"
            : "invalid-token";

    return { success: false, reason: mappedReason };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  if (!check.userId || !check.recordId) {
    return { success: false, reason: "invalid-token" };
  }

  await db.$transaction([
    db.user.update({
      where: { id: check.userId },
      data: {
        password: hashedPassword,
      },
    }),
    db.passwordResetToken.update({
      where: { id: check.recordId },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  return { success: true };
}
