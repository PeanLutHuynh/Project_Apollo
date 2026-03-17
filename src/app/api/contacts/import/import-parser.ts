import { NextResponse } from "next/server";
import { normalizeFileExt, readRawRows } from "./import-readers";
import { buildCandidateRows } from "./import-row-mapper";
import { validateCandidateRows } from "./import-validation";
import type { InvalidRow, ImportCandidateRow, ImportValidRow } from "./import-types";
export { SAMPLE_ROW, SUPPORTED_FIELDS } from "./import-types";
export type { InvalidRow, ImportCandidateRow, ImportValidRow } from "./import-types";

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

  const rawRows = await readRawRows(file, ext);

  if (rawRows.length === 0) {
    return {
      error: NextResponse.json(
        { success: false, error: "The uploaded file is empty" },
        { status: 400 }
      ),
    };
  }

  const candidateRows = buildCandidateRows(rawRows);

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

  const { validRows, invalidRows } = validateCandidateRows(candidateRows);

  return { candidateRows, validRows, invalidRows };
}
