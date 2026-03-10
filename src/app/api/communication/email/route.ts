import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmailSchema } from "@/schemas/communication.schema";
import { sendEmailToContact } from "@/services/communication.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await sendEmailToContact(session.user.id, parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email send failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
