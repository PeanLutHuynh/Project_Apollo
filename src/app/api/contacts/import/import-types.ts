export type RawRow = Record<string, unknown>;

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
