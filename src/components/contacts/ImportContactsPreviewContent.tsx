import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PreviewData } from "@/components/contacts/import-contacts.types";

type ImportContactsPreviewContentProps = {
  preview: PreviewData | null;
  selectedFile: File | null;
  isPreviewing: boolean;
  isImporting: boolean;
  onChooseFile: () => void;
};

export function ImportContactsPreviewContent({
  preview,
  selectedFile,
  isPreviewing,
  isImporting,
  onChooseFile,
}: ImportContactsPreviewContentProps) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border p-4">
        <p className="font-medium">Supported Data Columns</p>
        <p className="mt-1 text-muted-foreground">
          Column names can be flexible. Enum columns must use valid values (Also support Vietnamese).
        </p>
        <ul className="mt-3 space-y-1 text-muted-foreground">
          {(preview?.supportedFields ?? [
            "Full Name / Name / Ho Ten",
            "Customer Type / Loai Khach Hang (enterprise | personal | partner)",
            "Contact Source / Nguon Khach Hang (facebook | zalo | staff | other)",
            "Phone Number / Phone / Mobile / So Dien Thoai / SDT",
            "Email / Mail",
            "Address / Dia Chi",
            "Notes / Note / Ghi Chu",
          ]).map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border p-4">
        <p className="font-medium">Example row</p>
        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">Full Name</th>
                <th className="px-3 py-2">Customer Type</th>
                <th className="px-3 py-2">Contact Source</th>
                <th className="px-3 py-2">Phone Number</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2">{preview?.sampleRow.fullName ?? "Nguyen Van A"}</td>
                <td className="px-3 py-2">{preview?.sampleRow.customerType ?? "personal"}</td>
                <td className="px-3 py-2">{preview?.sampleRow.contactSource ?? "zalo"}</td>
                <td className="px-3 py-2">{preview?.sampleRow.phoneNumber ?? "+84935205238"}</td>
                <td className="px-3 py-2">{preview?.sampleRow.email ?? "nguyenvana@example.com"}</td>
                <td className="px-3 py-2">{preview?.sampleRow.address ?? "Da Nang"}</td>
                <td className="px-3 py-2">{preview?.sampleRow.notes ?? "VIP customer"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="font-medium">Duplicate rule</p>
        <p className="mt-1 text-muted-foreground">
          A row is only treated as duplicate if full name, phone number, and email all match an existing
          contact or another row in the file.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <p className="font-medium">Note when importing</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>Customer Type valid: enterprise, personal, partner</li>
          <li>Contact Source valid: facebook, zalo, staff, other</li>
          <li>If an enum is invalid, the row will be skipped and the reason will be shown in the preview.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isPreviewing || isImporting}
          onClick={onChooseFile}
        >
          {isPreviewing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </>
          )}
        </Button>
        <span className="text-muted-foreground">
          {selectedFile ? selectedFile.name : "No file chosen"}
        </span>
      </div>

      {preview && (
        <div className="rounded-lg border p-4">
          <p className="font-medium">Preview Import Data</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Rows Read</p>
              <p className="text-lg font-semibold">{preview.detected}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Valid Rows</p>
              <p className="text-lg font-semibold">{preview.validRows}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Ready to Import</p>
              <p className="text-lg font-semibold">{preview.readyToImport}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Invalid Rows</p>
              <p className="text-lg font-semibold">{preview.invalidRows.length}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Duplicate with Existing Data</p>
              <p className="text-lg font-semibold">{preview.duplicateExisting}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Duplicate in File</p>
              <p className="text-lg font-semibold">{preview.duplicateInFile}</p>
            </div>
          </div>

          {preview.skippedRows.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="font-medium">First skipped rows</p>
              <div className="max-h-40 overflow-y-auto rounded border">
                {preview.skippedRows.map((row) => (
                  <div key={`${row.row}-${row.reason}`} className="border-b px-3 py-2 last:border-b-0">
                    <p className="font-medium">Row {row.row}</p>
                    <p className="text-muted-foreground">{row.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
