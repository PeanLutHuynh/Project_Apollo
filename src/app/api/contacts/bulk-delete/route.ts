import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteContactsBulk } from "@/services/contact.service";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { success: false, error: "No contacts selected" },
      { status: 400 }
    );
  }

  const deleted = await deleteContactsBulk(session.user.id, ids);
  revalidatePath("/contacts");

  return NextResponse.json({
    success: true,
    data: { deleted },
  });
}
