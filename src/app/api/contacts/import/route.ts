import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeContactImport, importContacts } from "@/services/contact-import.service";
import { revalidatePath } from "next/cache";
import { parseImportFile, SAMPLE_ROW, SUPPORTED_FIELDS } from "./import-parser";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "Please choose a CSV or XLSX file" },
      { status: 400 }
    );
  }
  const mode = formData.get("mode") === "preview" ? "preview" : "import";
  const parsedFile = await parseImportFile(file);
  if ("error" in parsedFile) {
    return parsedFile.error;
  }

  const { candidateRows, validRows, invalidRows } = parsedFile;

  if (validRows.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid contacts found in the uploaded file",
        data: { invalidRows },
      },
      { status: 400 }
    );
  }

  const analysis = await analyzeContactImport(session.user.id, validRows);

  if (mode === "preview") {
    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        detected: candidateRows.length,
        validRows: validRows.length,
        invalidRows,
        duplicateExisting: analysis.summary.duplicateExisting,
        duplicateInFile: analysis.summary.duplicateInFile,
        readyToImport: analysis.summary.ready,
        supportedFields: SUPPORTED_FIELDS,
        sampleRow: SAMPLE_ROW,
        skippedRows: [...analysis.skipped, ...invalidRows].slice(0, 10),
      },
    });
  }

  const result = await importContacts(session.user.id, validRows);
  revalidatePath("/contacts");

  return NextResponse.json({
    success: true,
    data: {
      imported: result.imported,
      detected: candidateRows.length,
      validRows: validRows.length,
      duplicateExisting: analysis.summary.duplicateExisting,
      duplicateInFile: analysis.summary.duplicateInFile,
      skippedRows: [...result.skipped, ...invalidRows],
    },
  });
}