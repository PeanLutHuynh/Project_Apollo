"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
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
import type { PreviewData } from "@/components/contacts/import-contacts.types";
import { ImportContactsPreviewContent } from "@/components/contacts/ImportContactsPreviewContent";

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

          <ImportContactsPreviewContent
            preview={preview}
            selectedFile={selectedFile}
            isPreviewing={isPreviewing}
            isImporting={isImporting}
            onChooseFile={() => inputRef.current?.click()}
          />

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