import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { createContactSchema } from "@/schemas/contact.schema";
import { analyzeContactImport, importContacts } from "@/services/contact.service";
import { revalidatePath } from "next/cache";

type RawRow = Record<string, unknown>;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getField(row: RawRow, keys: string[]): string {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    if (keys.includes(normalizeHeader(key))) {
      return normalizeImportedText(String(value ?? ""));
    }
  }

  return "";
}

function tryRepairVietnameseMojibake(value: string): string {
  // Detect common mojibake patterns like "Huá»³nh", "TrÆ°á»ng".
  if (!/(Ã|Â|Æ|Ä|á»|�)/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    return repaired.includes("�") ? value : repaired;
  } catch {
    return value;
  }
}

function normalizeImportedText(value: string): string {
  const trimmed = value.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return "";
  }

  return tryRepairVietnameseMojibake(trimmed);
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.toString().replace(/[\s\-\(\.\)]/g, "");

  if (cleaned.startsWith("+")) return cleaned;

  // 0xxxxxxxxx → +84xxxxxxxxx
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+84" + cleaned.slice(1);
  }

  // 84xxxxxxxxx → +84xxxxxxxxx
  if (cleaned.startsWith("84") && cleaned.length === 11) {
    return "+" + cleaned;
  }

  return "+" + cleaned;
}

function mapRow(row: RawRow) {
  const rawPhone = getField(row, [
    "phonenumber",
    "phone",
    "mobile",
    "mobilenumber",
    "sodienthoai",
    "sdt",
  ]);
  return {
    fullName: getField(row, ["fullname", "name", "contactname", "hoten"]),
    phoneNumber: rawPhone ? normalizePhoneNumber(rawPhone) : "",
    email: getField(row, ["email", "mail"]),
    address: getField(row, ["address", "diachi"]),
    notes: getField(row, ["notes", "note", "ghichu"]),
  };
}

function formatZodIssue(path: Array<string | number>, message: string): string {
  const field = path[0] ? String(path[0]) : "row";
  return `${field}: ${message}`;
}

async function parseImportFile(file: File) {
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Only .csv, .xlsx, and .xls files are supported" },
        { status: 400 }
      ),
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      error: NextResponse.json(
        { success: false, error: "The uploaded file is empty" },
        { status: 400 }
      ),
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unable to read the first sheet from the file" },
        { status: 400 }
      ),
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: "",
    raw: false,
  });

  const candidateRows = rawRows
    .map((row, index) => ({ row: index + 2, ...mapRow(row) }))
    .filter(
      (row) =>
        row.fullName || row.phoneNumber || row.email || row.address || row.notes
    );

  if (candidateRows.length === 0) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error:
            "No contact rows found. Use headers like Full Name, Phone Number, Email, Address, Notes.",
        },
        { status: 400 }
      ),
    };
  }

  const validRows: Array<{
    row: number;
    fullName: string;
    phoneNumber: string;
    email: string;
    address: string | null;
    notes: string | null;
  }> = [];
  const invalidRows: Array<{ row: number; reason: string }> = [];

  for (const row of candidateRows) {
    const parsed = createContactSchema.safeParse({
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      email: row.email,
      address: row.address,
      notes: row.notes,
    });

    if (!parsed.success) {
      invalidRows.push({
        row: row.row,
        reason: parsed.error.issues
          .map((issue) => formatZodIssue(issue.path, issue.message))
          .join("; "),
      });
      continue;
    }

    validRows.push({
      row: row.row,
      fullName: parsed.data.fullName,
      phoneNumber: parsed.data.phoneNumber,
      email: parsed.data.email,
      address: parsed.data.address ? parsed.data.address : null,
      notes: parsed.data.notes ? parsed.data.notes : null,
    });
  }

  return {
    candidateRows,
    validRows,
    invalidRows,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "Please choose a CSV or XLSX file" },
      { status: 400 }
    );
  }
  const mode = formData.get("mode") === "preview" ? "preview" : "import";
  const parsedFile = await parseImportFile(file);
  if ("error" in parsedFile) {
    return parsedFile.error;
  }

  const { candidateRows, validRows, invalidRows } = parsedFile;

  if (validRows.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid contacts found in the uploaded file",
        data: { invalidRows },
      },
      { status: 400 }
    );
  }

  const analysis = await analyzeContactImport(session.user.id, validRows);

  if (mode === "preview") {
    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        detected: candidateRows.length,
        validRows: validRows.length,
        invalidRows,
        duplicateExisting: analysis.summary.duplicateExisting,
        duplicateInFile: analysis.summary.duplicateInFile,
        readyToImport: analysis.summary.ready,
        supportedFields: [
          "Full Name / Name / Ho Ten",
          "Phone Number / Phone / Mobile / So Dien Thoai / SDT",
          "Email / Mail",
          "Address / Dia Chi",
          "Notes / Note / Ghi Chu",
        ],
        sampleRow: {
          fullName: "Nguyen Van A",
          phoneNumber: "+84935205238",
          email: "nguyenvana@example.com",
          address: "Da Nang",
          notes: "VIP customer",
        },
        skippedRows: [...analysis.skipped, ...invalidRows].slice(0, 10),
      },
    });
  }

  const result = await importContacts(session.user.id, validRows);
  revalidatePath("/contacts");

  return NextResponse.json({
    success: true,
    data: {
      imported: result.imported,
      detected: candidateRows.length,
      validRows: validRows.length,
      duplicateExisting: analysis.summary.duplicateExisting,
      duplicateInFile: analysis.summary.duplicateInFile,
      skippedRows: [...result.skipped, ...invalidRows],
    },
  });
}