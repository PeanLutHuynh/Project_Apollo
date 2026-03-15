import type { ContactDTO } from "@/types";

export type ResizableColumn =
  | "name"
  | "customerType"
  | "source"
  | "phone"
  | "email"
  | "address"
  | "notes";

export type SortKey = "name" | "email" | "address";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

export type BulkEditField = "customerType" | "contactSource" | "address" | "notes";

export const MIN_WIDTHS: Record<ResizableColumn, number> = {
  name: 160,
  customerType: 120,
  source: 100,
  phone: 140,
  email: 200,
  address: 140,
  notes: 160,
};

export const MAX_WIDTHS: Record<ResizableColumn, number> = {
  name: 480,
  customerType: 180,
  source: 170,
  phone: 210,
  email: 360,
  address: 260,
  notes: 300,
};

export function customerTypeLabel(value: ContactDTO["customerType"]): string {
  if (value === "enterprise") return "Enterprise";
  if (value === "partner") return "Partner";
  return "Personal";
}

export function sourceLabel(value: ContactDTO["contactSource"]): string {
  if (value === "facebook") return "Facebook";
  if (value === "zalo") return "Zalo";
  if (value === "staff") return "Staff";
  return "Other";
}

export function customerTypeBadgeClass(value: ContactDTO["customerType"]): string {
  if (value === "enterprise") {
    return "border-blue-300/40 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (value === "partner") {
    return "border-violet-300/40 bg-violet-500/15 text-violet-700 dark:text-violet-300";
  }

  return "border-amber-300/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

export function bulkFieldLabel(field: BulkEditField): string {
  if (field === "customerType") return "Customer Type";
  if (field === "contactSource") return "Source";
  if (field === "address") return "Address";
  return "Notes";
}

export function contactFieldDisplayValue(contact: ContactDTO, field: BulkEditField): string {
  if (field === "customerType") return customerTypeLabel(contact.customerType);
  if (field === "contactSource") return sourceLabel(contact.contactSource);
  if (field === "address") return contact.address ?? "-";
  return contact.notes ?? "-";
}

export function contactFieldRawValue(contact: ContactDTO, field: BulkEditField): string {
  if (field === "customerType") return contact.customerType;
  if (field === "contactSource") return contact.contactSource;
  if (field === "address") return contact.address ?? "";
  return contact.notes ?? "";
}
