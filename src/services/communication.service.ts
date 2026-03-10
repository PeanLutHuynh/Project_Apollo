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

export async function sendBulkSMSToContacts(
  userId: string,
  input: BulkSMSInput
): Promise<BulkSendResult> {
  const contacts = await db.contact.findMany({
    where: { id: { in: input.contactIds }, userId },
  });

  const sendPromises = contacts.map(async (contact) => {
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
  });

  const settled = await Promise.allSettled(sendPromises);
  const results: CommunicationDTO[] = [];
  let sent = 0;
  let failed = 0;

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
      if (outcome.value.status === "sent") sent++;
      else failed++;
    } else {
      failed++;
    }
  }

  return { sent, failed, results };
}

export async function sendBulkEmailToContacts(
  userId: string,
  input: BulkEmailInput
): Promise<BulkSendResult> {
  const contacts = await db.contact.findMany({
    where: { id: { in: input.contactIds }, userId },
  });

  const sendPromises = contacts.map(async (contact) => {
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

    const result = await sendEmailViaAWS(contact.email, input.subject, input.message);

    return db.communication.update({
      where: { id: record.id },
      data: {
        status: result.success ? "sent" : "failed",
        errorMsg: result.success ? null : (result.error ?? null),
      },
    });
  });

  const settled = await Promise.allSettled(sendPromises);
  const results: CommunicationDTO[] = [];
  let sent = 0;
  let failed = 0;

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
      if (outcome.value.status === "sent") sent++;
      else failed++;
    } else {
      failed++;
    }
  }

  return { sent, failed, results };
}
