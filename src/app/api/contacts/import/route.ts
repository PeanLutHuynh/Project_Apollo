import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeContactImport, importContacts } from "@/services/contact-import.service";
import { revalidatePath } from "next/cache";
import { parseImportFile, SAMPLE_ROW, SUPPORTED_FIELDS } from "./import-parser";
import {
  checkRequestRateLimit,
  createRateLimitErrorResponse,
} from "@/lib/rate-limit";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

function logImportEvent(event: string, metadata: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      source: "api/contacts/import",
      timestamp: new Date().toISOString(),
      ...metadata,
    })
  );
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  const rateLimit = checkRequestRateLimit(req, "contacts-import", {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    logImportEvent("import_rate_limited", {
      ip: clientIp,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return createRateLimitErrorResponse(rateLimit.retryAfterSeconds);
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    logImportEvent("import_unauthorized", {
      ip: clientIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const mode = formData.get("mode") === "preview" ? "preview" : "import";

  if (!(file instanceof File)) {
    logImportEvent("import_invalid_payload", {
      userId: session.user.id,
      ip: clientIp,
      mode,
      reason: "missing_file",
    });
    return NextResponse.json(
      { success: false, error: "Please choose a CSV or XLSX file" },
      { status: 400 }
    );
  }

  logImportEvent("import_attempt", {
    userId: session.user.id,
    ip: clientIp,
    mode,
    fileName: file.name,
    fileSize: file.size,
  });

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    logImportEvent("import_rejected", {
      userId: session.user.id,
      ip: clientIp,
      mode,
      fileName: file.name,
      fileSize: file.size,
      reason: "file_too_large",
      maxBytes: MAX_IMPORT_FILE_BYTES,
    });
    return NextResponse.json(
      {
        success: false,
        error: "File too large. Maximum allowed size is 5MB.",
      },
      { status: 413 }
    );
  }

  const parsedFile = await parseImportFile(file);
  if ("error" in parsedFile) {
    logImportEvent("import_parse_rejected", {
      userId: session.user.id,
      ip: clientIp,
      mode,
      fileName: file.name,
      fileSize: file.size,
    });
    return parsedFile.error;
  }

  const { candidateRows, validRows, invalidRows } = parsedFile;

  if (validRows.length === 0) {
    logImportEvent("import_no_valid_rows", {
      userId: session.user.id,
      ip: clientIp,
      mode,
      fileName: file.name,
      detected: candidateRows.length,
      invalidRows: invalidRows.length,
    });
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
    logImportEvent("import_preview_success", {
      userId: session.user.id,
      ip: clientIp,
      fileName: file.name,
      detected: candidateRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      duplicateExisting: analysis.summary.duplicateExisting,
      duplicateInFile: analysis.summary.duplicateInFile,
      readyToImport: analysis.summary.ready,
    });

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

  logImportEvent("import_commit_success", {
    userId: session.user.id,
    ip: clientIp,
    fileName: file.name,
    detected: candidateRows.length,
    validRows: validRows.length,
    invalidRows: invalidRows.length,
    imported: result.imported,
    duplicateExisting: analysis.summary.duplicateExisting,
    duplicateInFile: analysis.summary.duplicateInFile,
    skippedRows: result.skipped.length + invalidRows.length,
  });

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