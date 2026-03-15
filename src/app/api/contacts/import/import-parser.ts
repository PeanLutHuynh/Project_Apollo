import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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

export async function parseImportFile(file: File): Promise<
  | { error: NextResponse }
  | { candidateRows: ImportCandidateRow[]; validRows: ImportValidRow[]; invalidRows: InvalidRow[] }
> {
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
