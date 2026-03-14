import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchContactRecipients } from "@/services/contact.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const limit = Number(searchParams.get("limit") ?? 30);

  const recipients = await searchContactRecipients(session.user.id, search, limit);
  return NextResponse.json({ success: true, data: recipients });
}
