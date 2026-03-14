"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Loader2, CheckCircle, XCircle, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { bulkSMSSchema, type BulkSMSFormValues } from "@/schemas/communication.schema";
import { useRecipientSearch, type RecipientOption } from "@/hooks/use-recipient-search";
import ConfirmActionDialog from "@/components/communication/ConfirmActionDialog";

export default function BulkSMSForm() {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const { query, setQuery, results, isLoading } = useRecipientSearch(50, isSuggestionsOpen);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, RecipientOption>>({});
  const [confirmAction, setConfirmAction] = useState<"deselect-visible" | "clear-selected" | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const recipientBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!recipientBoxRef.current) {
        return;
      }

      if (!recipientBoxRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const form = useForm<BulkSMSFormValues>({
    resolver: zodResolver(bulkSMSSchema),
    defaultValues: { contactIds: [], message: "" },
  });

  const selectedCount = selectedIds.length;

  const visibleIds = useMemo(() => results.map((contact) => contact.id), [results]);

  function applyToggleAll(allVisibleSelected: boolean) {

    const newVal = allVisibleSelected
      ? selectedIds.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...selectedIds, ...visibleIds]));

    setSelectedRecipients((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        visibleIds.forEach((id) => delete next[id]);
      } else {
        results.forEach((recipient) => {
          next[recipient.id] = recipient;
        });
      }
      return next;
    });

    setSelectedIds(newVal);
    form.setValue("contactIds", newVal, { shouldValidate: true });
  }

  function toggleAll() {
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected && selectedIds.length > 0) {
      setConfirmAction("deselect-visible");
      return;
    }

    applyToggleAll(allVisibleSelected);
  }

  function toggleContact(id: string) {
    const newVal = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    const picked = results.find((contact) => contact.id === id);
    setSelectedRecipients((prev) => {
      const next = { ...prev };
      if (newVal.includes(id) && picked) {
        next[id] = picked;
      } else {
        delete next[id];
      }
      return next;
    });

    setSelectedIds(newVal);
    form.setValue("contactIds", newVal, { shouldValidate: true });
  }

  function removeSelectedRecipient(id: string) {
    const newVal = selectedIds.filter((selectedId) => selectedId !== id);
    setSelectedIds(newVal);
    setSelectedRecipients((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    form.setValue("contactIds", newVal, { shouldValidate: true });
  }

  function clearSelectedRecipients() {
    if (selectedIds.length === 0) {
      return;
    }

    setSelectedIds([]);
    setSelectedRecipients({});
    form.setValue("contactIds", [], { shouldValidate: true });
  }

  function onConfirmAction() {
    if (confirmAction === "deselect-visible") {
      applyToggleAll(true);
    }

    if (confirmAction === "clear-selected") {
      clearSelectedRecipients();
    }

    setConfirmAction(null);
  }

  function openClearSelectedConfirm() {
    setIsSuggestionsOpen(false);
    setConfirmAction("clear-selected");
  }

  async function onSubmit(values: BulkSMSFormValues) {
    setResult(null);
    const res = await fetch("/api/communication/bulk-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      const { sent, failed } = data.data as { sent: number; failed: number };
      setResult({
        success: true,
        message: `Sent to ${sent} contact${sent !== 1 ? "s" : ""}${failed > 0 ? `. ${failed} failed.` : "."}`,
      });
      setSelectedIds([]);
      setSelectedRecipients({});
      setQuery("");
      setIsSuggestionsOpen(false);
      form.reset();
    } else {
      setResult({
        success: false,
        message: data.error ?? "Failed to send bulk SMS",
      });
    }
  }

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const selectedRecipientList = selectedIds
    .map((id) => selectedRecipients[id])
    .filter((value): value is RecipientOption => Boolean(value));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="contactIds"
          render={() => (
            <FormItem>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Recipients</FormLabel>
                <div className="flex items-center gap-2">
                  {selectedCount > 0 && (
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {selectedCount} selected
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                    disabled={results.length === 0}
                  >
                    {allSelected ? "Deselect Visible" : "Select Visible"}
                  </Button>
                </div>
              </div>
              <div ref={recipientBoxRef} className="space-y-2">
                <Input
                  placeholder="Search recipients by name, phone, or email..."
                  value={query}
                  onFocus={() => setIsSuggestionsOpen(true)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setIsSuggestionsOpen(true);
                  }}
                />
                {isSuggestionsOpen && (
                  <div className="h-48 overflow-y-auto rounded-md border p-2">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
                    ) : results.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No matching recipients
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {results.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                            onClick={() => toggleContact(contact.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(contact.id)}
                              onChange={() => toggleContact(contact.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border border-input accent-primary cursor-pointer"
                            />
                            <span className="text-sm font-medium flex-1">
                              {contact.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {contact.phoneNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedRecipientList.length > 0 && (
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground mb-2">Selected recipients</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipientList.slice(0, 6).map((recipient) => (
                      <Badge key={recipient.id} variant="secondary" className="gap-1">
                        <span>{recipient.fullName}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedRecipient(recipient.id)}
                          aria-label={`Remove ${recipient.fullName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedRecipientList.length > 6 && (
                      <Badge variant="outline">+{selectedRecipientList.length - 6} more</Badge>
                    )}
                  </div>
                </div>
              )}
              {selectedRecipientList.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openClearSelectedConfirm();
                    }}
                    onClick={openClearSelectedConfirm}
                  >
                    Clear selected
                  </Button>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Type your SMS message here..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription className="flex items-center justify-between">
                <span>Max 160 characters for standard SMS</span>
                <Badge
                  variant={field.value.length > 160 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {field.value.length}/160
                </Badge>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting || selectedCount === 0}
          className="w-full sm:w-auto"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send to {selectedCount > 0 ? `${selectedCount} Contact${selectedCount !== 1 ? "s" : ""}` : "Contacts"}
            </>
          )}
        </Button>
      </form>
      <ConfirmActionDialog
        open={confirmAction !== null}
        title={confirmAction === "deselect-visible" ? "Deselect Visible Recipients" : "Clear Selected Recipients"}
        description={
          confirmAction === "deselect-visible"
            ? "This will remove only recipients in the current search result from your selection."
            : `This will remove all ${selectedIds.length} selected recipient(s).`
        }
        confirmLabel={confirmAction === "deselect-visible" ? "Deselect Visible" : "Clear Selected"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={onConfirmAction}
      />
    </Form>
  );
}
