import type { ContactDTO } from "@/types";
import { contactFieldRawValue, type BulkEditField } from "@/components/contacts/contacts-table-shared";

export function buildBulkUpdates(
  selectedContacts: ContactDTO[],
  bulkEditField: BulkEditField,
  bulkEditValues: Record<string, string>
): Array<{ id: string; value: string }> {
  return selectedContacts
    .map((contact) => {
      const nextValue = (bulkEditValues[contact.id] ?? "").trim();
      const currentValue = contactFieldRawValue(contact, bulkEditField).trim();

      if (nextValue === "" && (bulkEditField === "address" || bulkEditField === "notes")) {
        return null;
      }

      if (nextValue === currentValue) {
        return null;
      }

      return { id: contact.id, value: nextValue };
    })
    .filter((item): item is { id: string; value: string } => item !== null);
}

export function buildBulkEditValues(
  selectedContacts: ContactDTO[],
  field: BulkEditField
): Record<string, string> {
  return selectedContacts.reduce<Record<string, string>>((acc, contact) => {
    acc[contact.id] = contactFieldRawValue(contact, field);
    return acc;
  }, {});
}
