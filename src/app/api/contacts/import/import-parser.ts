import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { createContactSchema } from "@/schemas/contact.schema";

type RawRow = Record<string, unknown>;

export type ImportCandidateRow = {
  row: number;
  fullName: string;
  rawCustomerType: string;
  rawContactSource: string;
  customerType: "enterprise" | "personal" | "partner" | "";
  contactSource: "facebook" | "zalo" | "staff" | "other" | "";
  phoneNumber: string;
  email: string;
  address: string;
  notes: string;
};

export type ImportValidRow = {
  row: number;
  fullName: string;
  customerType: "enterprise" | "personal" | "partner";
  contactSource: "facebook" | "zalo" | "staff" | "other";
  phoneNumber: string;
  email: string;
  address: string | null;
  notes: string | null;
};

export type InvalidRow = { row: number; reason: string };

export const SUPPORTED_FIELDS = [
  "Full Name / Name / Ho Ten / Ho Va Ten",
  "Customer Type / Loai Khach Hang (enterprise | personal | partner)",
  "Contact Source / Nguon / Kenh (facebook | zalo | staff | other)",
  "Phone Number / Phone / Mobile / So Dien Thoai / SDT",
  "Email / Mail",
  "Address / Dia Chi",
  "Notes / Note / Ghi Chu",
];

export const SAMPLE_ROW = {
  fullName: "Nguyen Van A",
  customerType: "personal",
  contactSource: "zalo",
  phoneNumber: "+84935205238",
  email: "nguyenvana@example.com",
  address: "Da Nang",
  notes: "VIP customer",
};

function normalizeFileExt(fileName: string): "csv" | "xlsx" | "xls" | "other" {
  const lowered = fileName.toLowerCase();
  if (lowered.endsWith(".csv")) return "csv";
  if (lowered.endsWith(".xlsx")) return "xlsx";
  if (lowered.endsWith(".xls")) return "xls";
  return "other";
}

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
  const cleaned = phone.toString().replace(/[\s\-\(\.\)]/g, "");

  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+84" + cleaned.slice(1);
  }
  if (cleaned.startsWith("84") && cleaned.length === 11) {
    return "+" + cleaned;
  }

  return "+" + cleaned;
}

function normalizeCustomerType(value: string): "enterprise" | "personal" | "partner" | "" {
  const normalized = normalizeHeader(value);

  if (["enterprise", "business", "company", "doanhnghiep"].includes(normalized)) {
    return "enterprise";
  }
  if (["personal", "individual", "person", "canhan"].includes(normalized)) {
    return "personal";
  }
  if (["partner", "agency", "doitac"].includes(normalized)) {
    return "partner";
  }

  return "";
}

function normalizeContactSource(value: string): "facebook" | "zalo" | "staff" | "other" | "" {
  const normalized = normalizeHeader(value);

  if (["facebook", "fb"].includes(normalized)) {
    return "facebook";
  }
  if (normalized === "zalo") {
    return "zalo";
  }
  if (["staff", "employee", "nhanvien", "sale", "sales"].includes(normalized)) {
    return "staff";
  }
  if (["other", "khac"].includes(normalized)) {
    return "other";
  }

  return "";
}

function mapRow(row: RawRow): ImportCandidateRow {
  const rawPhone = getField(row, [
    "phonenumber",
    "phone",
    "mobile",
    "mobilenumber",
    "sodienthoai",
    "sdt",
  ]);

  const rawCustomerType = getField(row, ["customertype", "customer", "loaikhachhang", "type"]);
  const rawContactSource = getField(row, ["contactsource", "source", "nguon", "nguonkhachhang", "kenh"]);

  return {
    row: 0,
    fullName: getField(row, ["fullname", "name", "contactname", "hoten", "hovaten"]),
    rawCustomerType,
    rawContactSource,
    customerType: normalizeCustomerType(rawCustomerType),
    contactSource: normalizeContactSource(rawContactSource),
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

async function parseXlsxRows(bytes: Uint8Array): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return [];
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];

  for (let col = 1; col <= headerRow.cellCount; col += 1) {
    headers.push(String(headerRow.getCell(col).text ?? "").trim());
  }

  if (headers.every((header) => header === "")) {
    return [];
  }

  const rows: RawRow[] = [];
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const excelRow = sheet.getRow(rowIndex);
    const row: RawRow = {};

    for (let col = 1; col <= headers.length; col += 1) {
      const header = headers[col - 1];
      if (!header) {
        continue;
      }

      row[header] = String(excelRow.getCell(col).text ?? "");
    }

    rows.push(row);
  }

  return rows;
}

function parseCsvRows(buffer: Buffer): RawRow[] {
  return parseCsv(buffer, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as RawRow[];
}

export async function parseImportFile(file: File): Promise<
  | { error: NextResponse }
  | { candidateRows: ImportCandidateRow[]; validRows: ImportValidRow[]; invalidRows: InvalidRow[] }
> {
  const ext = normalizeFileExt(file.name);
  if (ext === "other") {
    return {
      error: NextResponse.json(
        { success: false, error: "Only .csv and .xlsx files are supported" },
        { status: 400 }
      ),
    };
  }

  if (ext === "xls") {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Legacy .xls files are not supported. Please convert to .xlsx or .csv.",
        },
        { status: 400 }
      ),
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const rawRows =
    ext === "csv"
      ? parseCsvRows(Buffer.from(bytes))
      : await parseXlsxRows(bytes);

  if (rawRows.length === 0) {
    return {
      error: NextResponse.json(
        { success: false, error: "The uploaded file is empty" },
        { status: 400 }
      ),
    };
  }

  const candidateRows = rawRows
    .map((row, index) => ({ ...mapRow(row), row: index + 2 }))
    .filter(
      (row) =>
        row.fullName ||
        row.customerType ||
        row.contactSource ||
        row.phoneNumber ||
        row.email ||
        row.address ||
        row.notes
    );

  if (candidateRows.length === 0) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error:
            "No contact rows found. Use headers like Full Name, Customer Type, Contact Source, Phone Number, Email, Address, Notes.",
        },
        { status: 400 }
      ),
    };
  }

  const validRows: ImportValidRow[] = [];
  const invalidRows: InvalidRow[] = [];

  for (const row of candidateRows) {
    const enumErrors: string[] = [];

    if (row.rawCustomerType && !row.customerType) {
      enumErrors.push(
        `customerType not valid (label: ${row.rawCustomerType}). Valid values: enterprise | personal | partner`
      );
    }

    if (row.rawContactSource && !row.contactSource) {
      enumErrors.push(
        `contactSource not valid (label: ${row.rawContactSource}). Valid values: facebook | zalo | staff | other`
      );
    }

    if (enumErrors.length > 0) {
      invalidRows.push({ row: row.row, reason: enumErrors.join("; ") });
      continue;
    }

    const parsed = createContactSchema.safeParse({
      fullName: row.fullName,
      customerType: row.customerType,
      contactSource: row.contactSource,
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
      customerType: parsed.data.customerType,
      contactSource: parsed.data.contactSource,
      phoneNumber: parsed.data.phoneNumber,
      email: parsed.data.email,
      address: parsed.data.address ? parsed.data.address : null,
      notes: parsed.data.notes ? parsed.data.notes : null,
    });
  }

  return { candidateRows, validRows, invalidRows };
}
