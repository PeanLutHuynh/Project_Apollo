import type { BulkEditField } from "@/components/contacts/contacts-table-shared";

type BulkDeleteResponse = {
  success: boolean;
  error?: string;
  data?: { deleted?: number };
};

type BulkUpdateResponse = {
  success: boolean;
  error?: string;
  data?: { updated?: number };
};

export async function deleteContactsBulk(ids: string[]): Promise<number> {
  const res = await fetch("/api/contacts/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  const payload = (await res.json()) as BulkDeleteResponse;
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to delete selected contacts");
  }

  return payload.data?.deleted ?? 0;
}

export async function updateContactsBulk(
  field: BulkEditField,
  updates: Array<{ id: string; value: string }>
): Promise<number> {
  const res = await fetch("/api/contacts/bulk-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, updates }),
  });

  const payload = (await res.json()) as BulkUpdateResponse;
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to update selected contacts");
  }

  return payload.data?.updated ?? 0;
}
