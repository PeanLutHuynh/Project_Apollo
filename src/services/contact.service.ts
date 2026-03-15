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
