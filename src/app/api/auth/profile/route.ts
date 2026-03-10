import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { db } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().min(2).max(60),
});

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ success: true, data: user });
}
