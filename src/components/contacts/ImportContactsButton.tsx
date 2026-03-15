"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addLocalNotification } from "@/hooks/use-local-notifications";

type PreviewData = {
  fileName: string;
  detected: number;
  validRows: number;
  duplicateExisting: number;
  duplicateInFile: number;
  readyToImport: number;
  invalidRows: Array<{ row: number; reason: string }>;
  skippedRows: Array<{ row: number; reason: string }>;
  supportedFields: string[];
  sampleRow: {
    fullName: string;
    customerType: string;
    contactSource: string;
    phoneNumber: string;
    email: string;
    address: string;
    notes: string;
  };
};

export default function ImportContactsButton() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  async function parseApiResponse(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 200));
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setIsPreviewing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const res = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      });
      const data = await parseApiResponse(res);

      if (!res.ok) {
        const skipped = data.data?.invalidRows?.length
          ? ` ${data.data.invalidRows.length} row(s) were invalid.`
          : "";
        throw new Error((data.error ?? "Preview failed") + skipped);
      }

      setPreview(data.data ?? null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Preview failed",
        description:
          error instanceof Error ? error.message : "Unable to analyze file",
      });
    } finally {
      event.target.value = "";
      setIsPreviewing(false);
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      });
      const data = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      const imported = data.data?.imported ?? 0;
      const skippedRows = data.data?.skippedRows?.length ?? 0;
      const fileName = selectedFile.name;
      const message = `Import ${imported} contacts from file ${fileName}`;

      toast({
        title: "Import successful",
        description: skippedRows > 0 ? `${message}. Skipped ${skippedRows} rows.` : message,
      });

      addLocalNotification(
        "Import contacts",
        skippedRows > 0 ? `${message}. Skipped ${skippedRows} rows.` : message
      );

      setOpen(false);
      setSelectedFile(null);
      setPreview(null);
      router.push("/contacts");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Unable to import contacts",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="mr-2 h-4 w-4" />
        Import CSV/XLSX
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Contacts from File</DialogTitle>
            <DialogDescription>
              Supports CSV/XLSX. The system will automatically map columns and validate data before import.
            </DialogDescription>
          </DialogHeader>

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
                A row is only treated as duplicate if full name, phone number, and email all match an existing contact or another row in the file.
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
                onClick={() => inputRef.current?.click()}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={!preview || preview.readyToImport === 0 || isImporting}
              onClick={handleImport}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Contacts"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}