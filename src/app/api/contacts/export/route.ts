import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContactsForExport } from "@/services/contact.service";

function escapeCsvValue(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function toCsv(rows: Array<Record<string, string>>): string {
  const headers = ["Full Name", "Phone Number", "Email", "Address", "Notes"];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      [
        escapeCsvValue(row["Full Name"] ?? ""),
        escapeCsvValue(row["Phone Number"] ?? ""),
        escapeCsvValue(row["Email"] ?? ""),
        escapeCsvValue(row["Address"] ?? ""),
        escapeCsvValue(row["Notes"] ?? ""),
      ].join(",")
    );
  }

  return lines.join("\n");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await getContactsForExport(session.user.id);
  const data = contacts.map((contact) => ({
    "Full Name": contact.fullName,
    "Phone Number": contact.phoneNumber,
    Email: contact.email,
    Address: contact.address ?? "",
    Notes: contact.notes ?? "",
  }));

  // Prefix UTF-8 BOM so Excel on Windows reads Vietnamese correctly.
  const csv = `\uFEFF${toCsv(data)}`;
  const fileName = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
