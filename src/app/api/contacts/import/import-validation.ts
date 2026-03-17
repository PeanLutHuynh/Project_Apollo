import { createContactSchema } from "@/schemas/contact.schema";
import type { ImportCandidateRow, ImportValidRow, InvalidRow } from "./import-types";

function formatZodIssue(path: Array<string | number>, message: string): string {
  const field = path[0] ? String(path[0]) : "row";
  return `${field}: ${message}`;
}

export function validateCandidateRows(candidateRows: ImportCandidateRow[]): {
  validRows: ImportValidRow[];
  invalidRows: InvalidRow[];
} {
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

  return { validRows, invalidRows };
}
