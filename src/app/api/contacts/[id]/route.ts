import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateContactSchema } from "@/schemas/contact.schema";
import {
  getContactById,
  updateContact,
  deleteContact,
} from "@/services/contact.service";
import { revalidateTag } from "next/cache";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const contact = await getContactById(id, session.user.id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: contact });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const contact = await updateContact(id, session.user.id, parsed.data);
  revalidateTag("contacts");
  return NextResponse.json({ success: true, data: contact });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteContact(id, session.user.id);
  revalidateTag("contacts");
  return NextResponse.json({ success: true, message: "Contact deleted" });
}
