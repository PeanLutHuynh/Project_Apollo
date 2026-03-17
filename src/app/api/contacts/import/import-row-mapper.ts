import type { ImportCandidateRow, RawRow } from "./import-types";

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

function getField(row: RawRow, keys: string[]): string {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    if (keys.includes(normalizeHeader(key))) {
      return normalizeImportedText(String(value ?? ""));
    }
  }

  return "";
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

export function buildCandidateRows(rawRows: RawRow[]): ImportCandidateRow[] {
  return rawRows
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
}
