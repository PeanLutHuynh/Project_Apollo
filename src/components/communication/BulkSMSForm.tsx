"use client";

import { useState } from "react";
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
import { useBulkRecipientSelector } from "@/hooks/use-bulk-recipient-selector";
import ConfirmActionDialog from "@/components/communication/ConfirmActionDialog";

export default function BulkSMSForm() {
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const form = useForm<BulkSMSFormValues>({
    resolver: zodResolver(bulkSMSSchema),
    defaultValues: { contactIds: [], message: "" },
  });

  const recipients = useBulkRecipientSelector({
    onSelectionChange: (ids) => form.setValue("contactIds", ids, { shouldValidate: true }),
  });

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
      recipients.reset();
      form.reset();
    } else {
      setResult({
        success: false,
        message: data.error ?? "Failed to send bulk SMS",
      });
    }
  }

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
                  {recipients.selectedCount > 0 && (
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {recipients.selectedCount} selected
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={recipients.toggleAll}
                    disabled={recipients.results.length === 0}
                  >
                    {recipients.allSelected ? "Deselect Visible" : "Select Visible"}
                  </Button>
                </div>
              </div>
              <div ref={recipients.recipientBoxRef} className="space-y-2">
                <Input
                  placeholder="Search recipients by name, phone, or email..."
                  value={recipients.query}
                  onFocus={() => recipients.setIsSuggestionsOpen(true)}
                  onChange={(event) => {
                    recipients.setQuery(event.target.value);
                    recipients.setIsSuggestionsOpen(true);
                  }}
                />
                {recipients.isSuggestionsOpen && (
                  <div className="h-48 overflow-y-auto rounded-md border p-2">
                    {recipients.isLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
                    ) : recipients.results.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No matching recipients
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {recipients.results.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                            onClick={() => recipients.toggleContact(contact.id)}
                          >
                            <input
                              type="checkbox"
                              checked={recipients.selectedIds.includes(contact.id)}
                              onChange={() => recipients.toggleContact(contact.id)}
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
              {recipients.selectedRecipientList.length > 0 && (
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground mb-2">Selected recipients</p>
                  <div className="flex flex-wrap gap-2">
                    {recipients.selectedRecipientList.slice(0, 6).map((recipient) => (
                      <Badge key={recipient.id} variant="secondary" className="gap-1">
                        <span>{recipient.fullName}</span>
                        <button
                          type="button"
                          onClick={() => recipients.removeSelectedRecipient(recipient.id)}
                          aria-label={`Remove ${recipient.fullName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {recipients.selectedRecipientList.length > 6 && (
                      <Badge variant="outline">+{recipients.selectedRecipientList.length - 6} more</Badge>
                    )}
                  </div>
                </div>
              )}
              {recipients.selectedRecipientList.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      recipients.openClearSelectedConfirm();
                    }}
                    onClick={recipients.openClearSelectedConfirm}
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
          disabled={form.formState.isSubmitting || recipients.selectedCount === 0}
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
              Send to {recipients.selectedCount > 0 ? `${recipients.selectedCount} Contact${recipients.selectedCount !== 1 ? "s" : ""}` : "Contacts"}
            </>
          )}
        </Button>
      </form>
      <ConfirmActionDialog
        open={recipients.confirmAction !== null}
        title={recipients.confirmAction === "deselect-visible" ? "Deselect Visible Recipients" : "Clear Selected Recipients"}
        description={
          recipients.confirmAction === "deselect-visible"
            ? "This will remove only recipients in the current search result from your selection."
            : `This will remove all ${recipients.selectedIds.length} selected recipient(s).`
        }
        confirmLabel={recipients.confirmAction === "deselect-visible" ? "Deselect Visible" : "Clear Selected"}
        onCancel={() => recipients.setConfirmAction(null)}
        onConfirm={recipients.onConfirmAction}
      />
    </Form>
  );
}
