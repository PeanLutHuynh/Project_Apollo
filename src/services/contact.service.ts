import { db } from "@/lib/db";
import type {
  CreateContactInput,
  UpdateContactInput,
  PaginatedResponse,
  ContactDTO,
} from "@/types";

export async function getContacts(
  userId: string,
  page = 1,
  pageSize = 20,
  search?: string
): Promise<PaginatedResponse<ContactDTO>> {
  const where = {
    userId,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phoneNumber: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contact.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactById(
  id: string,
  userId: string
): Promise<ContactDTO | null> {
  return db.contact.findFirst({ where: { id, userId } });
}

export async function getAllContactsForUser(
  userId: string
): Promise<Pick<ContactDTO, "id" | "fullName" | "phoneNumber" | "email">[]> {
  return db.contact.findMany({
    where: { userId },
    select: { id: true, fullName: true, phoneNumber: true, email: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getContactsForExport(
  userId: string
): Promise<
  Pick<ContactDTO, "fullName" | "phoneNumber" | "email" | "address" | "notes">[]
> {
  return db.contact.findMany({
    where: { userId },
    select: {
      fullName: true,
      phoneNumber: true,
      email: true,
      address: true,
      notes: true,
    },
    orderBy: { fullName: "asc" },
  });
}

export async function createContact(
  userId: string,
  data: CreateContactInput
): Promise<ContactDTO> {
  return db.contact.create({ data: { ...data, userId } });
}

type ImportRow = CreateContactInput & { row: number };
type SkippedRow = { row: number; reason: string };

function getImportKey(row: Pick<ImportRow, "fullName" | "phoneNumber" | "email">) {
  return [
    row.fullName.trim().toLowerCase(),
    row.phoneNumber.trim(),
    row.email.trim().toLowerCase(),
  ].join("|");
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

export async function updateContact(
  id: string,
  userId: string,
  data: UpdateContactInput
): Promise<ContactDTO> {
  return db.contact.update({ where: { id, userId }, data });
}

export async function deleteContact(
  id: string,
  userId: string
): Promise<void> {
  await db.contact.delete({ where: { id, userId } });
}

export async function getContactCount(userId: string): Promise<number> {
  return db.contact.count({ where: { userId } });
}
