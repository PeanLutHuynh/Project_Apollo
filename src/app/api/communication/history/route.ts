import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommunicationHistory } from "@/services/communication.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const typeParam = searchParams.get("type");
  const type =
    typeParam === "sms" || typeParam === "email" ? typeParam : undefined;

  const result = await getCommunicationHistory(
    session.user.id,
    page,
    pageSize,
    type
  );
  return NextResponse.json({ success: true, data: result });
}
