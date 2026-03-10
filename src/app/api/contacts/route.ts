import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createContactSchema } from "@/schemas/contact.schema";
import { getContacts, createContact } from "@/services/contact.service";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const search = searchParams.get("search") ?? undefined;

  const result = await getContacts(session.user.id, page, pageSize, search);
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { address, notes, ...rest } = parsed.data;
  const contact = await createContact(session.user.id, {
    ...rest,
    address: address ?? null,
    notes: notes ?? null,
  });
  revalidateTag("contacts");
  return NextResponse.json({ success: true, data: contact }, { status: 201 });
}
