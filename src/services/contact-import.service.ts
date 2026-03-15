import { db } from "@/lib/db";
import type { CreateContactInput, UpdateContactInput, ContactDTO } from "@/types";

type ImportRow = CreateContactInput & { row: number };
type SkippedRow = { row: number; reason: string };

function getImportKey(row: Pick<ImportRow, "fullName" | "phoneNumber" | "email">) {
  return [
    row.fullName.trim().toLowerCase(),
    row.phoneNumber.trim(),
    row.email.trim().toLowerCase(),
  ].join("|");
}

export async function getContactsForExport(
  userId: string
): Promise<
  Pick<
    ContactDTO,
    "fullName" | "phoneNumber" | "email" | "customerType" | "contactSource" | "address" | "notes"
  >[]
> {
  return db.contact.findMany({
    where: { userId },
    select: {
      fullName: true,
      phoneNumber: true,
      email: true,
      customerType: true,
      contactSource: true,
      address: true,
      notes: true,
    },
    orderBy: { fullName: "asc" },
  });
}

export async function analyzeContactImport(
  userId: string,
  rows: ImportRow[]
): Promise<{
  readyToImport: CreateContactInput[];
  skipped: SkippedRow[];
  summary: {
    detected: number;
    ready: number;
    duplicateExisting: number;
    duplicateInFile: number;
  };
}> {
  if (rows.length === 0) {
    return {
      readyToImport: [],
      skipped: [],
      summary: {
        detected: 0,
        ready: 0,
        duplicateExisting: 0,
        duplicateInFile: 0,
      },
    };
  }

  const existing = await db.contact.findMany({
    where: {
      userId,
      OR: [
        { phoneNumber: { in: rows.map((row) => row.phoneNumber) } },
        { email: { in: rows.map((row) => row.email) } },
        { fullName: { in: rows.map((row) => row.fullName) } },
      ],
    },
    select: { fullName: true, phoneNumber: true, email: true },
  });

  const existingKeys = new Set(existing.map((contact) => getImportKey(contact)));
  const seenKeys = new Set<string>();
  const skipped: SkippedRow[] = [];
  const readyToImport: CreateContactInput[] = [];
  let duplicateExisting = 0;
  let duplicateInFile = 0;

  for (const row of rows) {
    const importKey = getImportKey(row);

    if (existingKeys.has(importKey)) {
      duplicateExisting += 1;
      skipped.push({ row: row.row, reason: "Duplicate existing contact" });
      continue;
    }

    if (seenKeys.has(importKey)) {
      duplicateInFile += 1;
      skipped.push({ row: row.row, reason: "Duplicate row in file" });
      continue;
    }

    seenKeys.add(importKey);
    readyToImport.push({
      fullName: row.fullName,
      customerType: row.customerType,
      contactSource: row.contactSource,
      address: row.address,
      phoneNumber: row.phoneNumber,
      email: row.email,
      notes: row.notes,
    });
  }

  return {
    readyToImport,
    skipped,
    summary: {
      detected: rows.length,
      ready: readyToImport.length,
      duplicateExisting,
      duplicateInFile,
    },
  };
}

export async function importContacts(
  userId: string,
  rows: ImportRow[]
): Promise<{ imported: number; skipped: Array<{ row: number; reason: string }> }> {
  const analysis = await analyzeContactImport(userId, rows);

  if (analysis.readyToImport.length > 0) {
    await db.contact.createMany({
      data: analysis.readyToImport.map((row) => ({ ...row, userId })),
    });
  }

  return { imported: analysis.readyToImport.length, skipped: analysis.skipped };
}

export async function deleteContactsBulk(
  userId: string,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const result = await db.contact.deleteMany({
    where: {
      userId,
      id: { in: ids },
    },
  });

  return result.count;
}

export async function updateContactsBulk(
  userId: string,
  ids: string[],
  data: Pick<UpdateContactInput, "customerType" | "contactSource">
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const result = await db.contact.updateMany({
    where: {
      userId,
      id: { in: ids },
    },
    data,
  });

  return result.count;
}

export async function updateContactsBulkField(
  userId: string,
  field: "customerType" | "contactSource" | "address" | "notes",
  updates: Array<{ id: string; value: string }>
): Promise<number> {
  if (updates.length === 0) {
    return 0;
  }

  const normalizedUpdates = updates.filter((item) => item.id.trim() !== "");
  if (normalizedUpdates.length === 0) {
    return 0;
  }

  const operations = normalizedUpdates.map((item) => {
    const value = item.value.trim();
    const data: UpdateContactInput =
      field === "customerType"
        ? { customerType: value as UpdateContactInput["customerType"] }
        : field === "contactSource"
          ? { contactSource: value as UpdateContactInput["contactSource"] }
          : field === "address"
            ? { address: value === "" ? null : value }
            : { notes: value === "" ? null : value };

    return db.contact.updateMany({
      where: {
        userId,
        id: item.id,
      },
      data,
    });
  });

  const results = await db.$transaction(operations);
  return results.reduce((acc, item) => acc + item.count, 0);
}
