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

export async function searchContactRecipients(
  userId: string,
  search = "",
  limit = 30
): Promise<Pick<ContactDTO, "id" | "fullName" | "phoneNumber" | "email">[]> {
  const safeLimit = Math.min(Math.max(limit, 5), 50);
  const trimmedSearch = search.trim();

  return db.contact.findMany({
    where: {
      userId,
      ...(trimmedSearch && {
        OR: [
          { fullName: { contains: trimmedSearch, mode: "insensitive" as const } },
          { email: { contains: trimmedSearch, mode: "insensitive" as const } },
          { phoneNumber: { contains: trimmedSearch } },
        ],
      }),
    },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      email: true,
    },
    orderBy: { fullName: "asc" },
    take: safeLimit,
  });
}

export async function createContact(
  userId: string,
  data: CreateContactInput
): Promise<ContactDTO> {
  return db.contact.create({ data: { ...data, userId } });
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

export async function getMonthlyContactGrowth(
  userId: string
): Promise<Array<{ month: string; count: number }>> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
  const startOfNextYear = new Date(Date.UTC(currentYear + 1, 0, 1, 0, 0, 0, 0));

  const rows = await db.$queryRaw<Array<{ month: Date; count: bigint }>>`
    SELECT
      DATE_TRUNC('month', "createdAt") AS month,
      COUNT(*) AS count
    FROM "Contact"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${startOfYear}
      AND "createdAt" < ${startOfNextYear}
    GROUP BY month
    ORDER BY month ASC
  `;

  const rowMap = new Map(
    rows.map((row) => [
      `${row.month.getUTCFullYear()}-${String(row.month.getUTCMonth() + 1).padStart(2, "0")}`,
      Number(row.count),
    ])
  );

  const series: Array<{ month: string; count: number }> = [];
  const cursor = new Date(startOfYear);
  for (let i = 0; i < 12; i += 1) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    series.push({ month: key, count: rowMap.get(key) ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return series;
}

export async function getContactSourceDistribution(
  userId: string
): Promise<Array<{ source: ContactDTO["contactSource"]; count: number }>> {
  const grouped = await db.contact.groupBy({
    by: ["contactSource"],
    where: { userId },
    _count: { _all: true },
  });

  return grouped
    .map((row) => ({ source: row.contactSource, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
}

function parseProvinceFromAddress(address: string): string | null {
  const normalized = address.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const segments = normalized
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const candidate = (segments.at(-1) ?? normalized)
    .replace(/^(thanh pho|tp\.?|tinh|province|city)\s+/i, "")
    .replace(/^[-\s]+|[-\s]+$/g, "")
    .trim();

  if (!candidate) return null;

  const key = candidate
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[-–—_/.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const canonicalMap: Record<string, string> = {
    "da nang": "Đà Nẵng",
    "ho chi minh": "TP. Hồ Chí Minh",
    "ho chi minh city": "TP. Hồ Chí Minh",
    hcm: "TP. Hồ Chí Minh",
    "ha noi": "Hà Nội",
    hanoi: "Hà Nội",
    "vung tau": "Vũng Tàu",
  };

  if (canonicalMap[key]) {
    return canonicalMap[key];
  }

  return candidate
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export async function getContactProvinceDensity(
  userId: string,
  limit = 12
): Promise<Array<{ province: string; count: number }>> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);

  const contacts = await db.contact.findMany({
    where: { userId, address: { not: null } },
    select: { address: true },
  });

  const densityMap = new Map<string, number>();

  for (const contact of contacts) {
    if (!contact.address) continue;
    const province = parseProvinceFromAddress(contact.address);
    if (!province) continue;
    densityMap.set(province, (densityMap.get(province) ?? 0) + 1);
  }

  return Array.from(densityMap.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, safeLimit);
}
