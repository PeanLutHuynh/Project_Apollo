"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addLocalNotification } from "@/hooks/use-local-notifications";

function parseFileNameFromDisposition(disposition: string | null): string {
  if (!disposition) {
    return `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const fileNameMatch = disposition.match(/filename="?([^\";]+)"?/i);
  if (fileNameMatch?.[1]) {
    return fileNameMatch[1];
  }

  return `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
}

export default function ExportContactsButton() {
  const { toast } = useToast();

  async function handleExport() {
    try {
      const res = await fetch("/api/contacts/export", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const fileName = parseFileNameFromDisposition(res.headers.get("content-disposition"));
      const exportedCount = Number(res.headers.get("x-export-count") ?? 0);

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      const message = `Export ${exportedCount} contacts into file ${fileName}`;

      toast({
        title: "Export successful",
        description: message,
      });

      addLocalNotification("Export contacts", message);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to export contacts",
      });
    }
  }

  return (
    <Button variant="outline" type="button" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export File
    </Button>
  );
}
