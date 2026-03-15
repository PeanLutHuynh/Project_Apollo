import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { updateContactsBulkField } from "@/services/contact-import.service";

const bulkUpdateSchema = z.object({
  field: z.enum(["customerType", "contactSource", "address", "notes"]),
  updates: z
    .array(
      z.object({
        id: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1, "No row changes provided"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bulkUpdateSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid payload";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const updated = await updateContactsBulkField(
    session.user.id,
    parsed.data.field,
    parsed.data.updates
  );
  revalidatePath("/contacts");

  return NextResponse.json({
    success: true,
    data: { updated },
  });
}
