import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import type { RawRow } from "./import-types";

export type ImportFileExt = "csv" | "xlsx" | "xls" | "other";

export function normalizeFileExt(fileName: string): ImportFileExt {
  const lowered = fileName.toLowerCase();
  if (lowered.endsWith(".csv")) return "csv";
  if (lowered.endsWith(".xlsx")) return "xlsx";
  if (lowered.endsWith(".xls")) return "xls";
  return "other";
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

export async function readRawRows(file: File, ext: Exclude<ImportFileExt, "other" | "xls">) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  return ext === "csv"
    ? parseCsvRows(Buffer.from(bytes))
    : parseXlsxRows(bytes);
}
