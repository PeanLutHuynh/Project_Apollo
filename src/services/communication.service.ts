import { db } from "@/lib/db";
import { sendSMS as sendSMSViaAWS } from "@/lib/sms";
import { sendEmail as sendEmailViaAWS } from "@/lib/email";
import type {
  SendSMSInput,
  SendEmailInput,
  BulkSMSInput,
  BulkEmailInput,
  BulkSendResult,
  CommunicationDTO,
  PaginatedResponse,
} from "@/types";

export async function sendSMSToContact(
  userId: string,
  input: SendSMSInput
): Promise<CommunicationDTO> {
  const contact = await db.contact.findFirst({
    where: { id: input.contactId, userId },
    select: { id: true, phoneNumber: true },
  });
  if (!contact) throw new Error("Contact not found");

  const record = await db.communication.create({
    data: {
      userId,
      contactId: contact.id,
      type: "sms",
      recipient: contact.phoneNumber,
      message: input.message,
      status: "pending",
    },
  });

  const result = await sendSMSViaAWS(contact.phoneNumber, input.message);

  return db.communication.update({
    where: { id: record.id },
    data: {
      status: result.success ? "sent" : "failed",
      errorMsg: result.success ? null : (result.error ?? null),
    },
  });
}

export async function sendEmailToContact(
  userId: string,
  input: SendEmailInput
): Promise<CommunicationDTO> {
  const contact = await db.contact.findFirst({
    where: { id: input.contactId, userId },
    select: { id: true, email: true },
  });
  if (!contact) throw new Error("Contact not found");

  const record = await db.communication.create({
    data: {
      userId,
      contactId: contact.id,
      type: "email",
      recipient: contact.email,
      subject: input.subject,
      message: input.message,
      status: "pending",
    },
  });

  const result = await sendEmailViaAWS(
    contact.email,
    input.subject,
    input.message
  );

  return db.communication.update({
    where: { id: record.id },
    data: {
      status: result.success ? "sent" : "failed",
      errorMsg: result.success ? null : (result.error ?? null),
    },
  });
}

export async function getCommunicationHistory(
  userId: string,
  page = 1,
  pageSize = 20,
  typeFilter?: "sms" | "email"
): Promise<PaginatedResponse<CommunicationDTO>> {
  const where = {
    userId,
    ...(typeFilter && { type: typeFilter }),
  };

  const [items, total] = await Promise.all([
    db.communication.findMany({
      where,
      include: {
        contact: {
          select: { fullName: true, phoneNumber: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.communication.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRecentCommunicationsCount(
  userId: string,
  days = 1
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db.communication.count({
    where: { userId, createdAt: { gte: since } },
  });
}

/** Single query returning today + this-week counts (replaces 2 separate COUNTs). */
export async function getRecentCommunicationsCounts(
  userId: string
): Promise<{ todayCount: number; weekCount: number }> {
  const now = new Date();
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db.$queryRaw<[{ today_count: bigint; week_count: bigint }]>`
    SELECT
      COUNT(*) FILTER (WHERE "createdAt" >= ${oneDayAgo}) AS today_count,
      COUNT(*) FILTER (WHERE "createdAt" >= ${sevenDaysAgo}) AS week_count
    FROM "Communication"
    WHERE "userId" = ${userId}
  `;

  return {
    todayCount: Number(result[0].today_count),
    weekCount: Number(result[0].week_count),
  };
}

export async function sendBulkSMSToContacts(
  userId: string,
  input: BulkSMSInput
): Promise<BulkSendResult> {
  const contacts = await db.contact.findMany({
    where: { id: { in: input.contactIds }, userId },
    select: { id: true, phoneNumber: true },
  });

  if (contacts.length === 0) return { sent: 0, failed: 0, results: [] };

  // 1 DB call: batch-insert all as pending instead of N separate creates
  const records = await db.communication.createManyAndReturn({
    data: contacts.map((c) => ({
      userId,
      contactId: c.id,
      type: "sms" as const,
      recipient: c.phoneNumber,
      message: input.message,
      status: "pending" as const,
    })),
  });

  const recordByContactId = new Map(records.map((r) => [r.contactId, r]));

  // Fire all AWS calls in parallel
  const awsResults = await Promise.allSettled(
    contacts.map(async (c) => {
      const awsResult = await sendSMSViaAWS(c.phoneNumber, input.message);
      return { recordId: recordByContactId.get(c.id)!.id, ...awsResult };
    })
  );

  // Partition results
  const sentIds: string[] = [];
  const failedEntries: { id: string; error: string }[] = [];
  for (const r of awsResults) {
    if (r.status === "fulfilled") {
      if (r.value.success) sentIds.push(r.value.recordId);
      else failedEntries.push({ id: r.value.recordId, error: r.value.error ?? "Send failed" });
    }
  }

  // Batch update sent (1 call) + parallel updates for failed (rare, each has unique errorMsg)
  const updateOps: Promise<unknown>[] = [];
  if (sentIds.length > 0) {
    updateOps.push(
      db.communication.updateMany({ where: { id: { in: sentIds } }, data: { status: "sent" } })
    );
  }
  for (const { id, error } of failedEntries) {
    updateOps.push(
      db.communication.update({ where: { id }, data: { status: "failed", errorMsg: error } })
    );
  }
  await Promise.all(updateOps);

  // 1 final fetch to return updated records
  const results = await db.communication.findMany({
    where: { id: { in: records.map((r) => r.id) } },
    orderBy: { createdAt: "desc" },
  });

  return { sent: sentIds.length, failed: failedEntries.length, results };
}

export async function sendBulkEmailToContacts(
  userId: string,
  input: BulkEmailInput
): Promise<BulkSendResult> {
  const contacts = await db.contact.findMany({
    where: { id: { in: input.contactIds }, userId },
    select: { id: true, email: true },
  });

  if (contacts.length === 0) return { sent: 0, failed: 0, results: [] };

  // 1 DB call: batch-insert all as pending instead of N separate creates
  const records = await db.communication.createManyAndReturn({
    data: contacts.map((c) => ({
      userId,
      contactId: c.id,
      type: "email" as const,
      recipient: c.email,
      subject: input.subject,
      message: input.message,
      status: "pending" as const,
    })),
  });

  const recordByContactId = new Map(records.map((r) => [r.contactId, r]));

  // Fire all AWS calls in parallel
  const awsResults = await Promise.allSettled(
    contacts.map(async (c) => {
      const awsResult = await sendEmailViaAWS(c.email, input.subject, input.message);
      return { recordId: recordByContactId.get(c.id)!.id, ...awsResult };
    })
  );

  // Partition results
  const sentIds: string[] = [];
  const failedEntries: { id: string; error: string }[] = [];
  for (const r of awsResults) {
    if (r.status === "fulfilled") {
      if (r.value.success) sentIds.push(r.value.recordId);
      else failedEntries.push({ id: r.value.recordId, error: r.value.error ?? "Send failed" });
    }
  }

  // Batch update sent (1 call) + parallel updates for failed (rare, each has unique errorMsg)
  const updateOps: Promise<unknown>[] = [];
  if (sentIds.length > 0) {
    updateOps.push(
      db.communication.updateMany({ where: { id: { in: sentIds } }, data: { status: "sent" } })
    );
  }
  for (const { id, error } of failedEntries) {
    updateOps.push(
      db.communication.update({ where: { id }, data: { status: "failed", errorMsg: error } })
    );
  }
  await Promise.all(updateOps);

  // 1 final fetch to return updated records
  const results = await db.communication.findMany({
    where: { id: { in: records.map((r) => r.id) } },
    orderBy: { createdAt: "desc" },
  });

  return { sent: sentIds.length, failed: failedEntries.length, results };
}
