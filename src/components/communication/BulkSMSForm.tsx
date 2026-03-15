"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import RecipientPicker from "@/components/communication/RecipientPicker";

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
            <RecipientPicker
              recipientBoxRef={recipients.recipientBoxRef}
              query={recipients.query}
              isSuggestionsOpen={recipients.isSuggestionsOpen}
              isLoading={recipients.isLoading}
              results={recipients.results}
              selectedIds={recipients.selectedIds}
              selectedRecipientList={recipients.selectedRecipientList}
              selectedCount={recipients.selectedCount}
              allSelected={recipients.allSelected}
              confirmAction={recipients.confirmAction}
              setQuery={recipients.setQuery}
              setIsSuggestionsOpen={recipients.setIsSuggestionsOpen}
              setConfirmAction={recipients.setConfirmAction}
              toggleAll={recipients.toggleAll}
              toggleContact={recipients.toggleContact}
              removeSelectedRecipient={recipients.removeSelectedRecipient}
              openClearSelectedConfirm={recipients.openClearSelectedConfirm}
              onConfirmAction={recipients.onConfirmAction}
              placeholder="Search recipients by name, phone, or email..."
              secondaryField="phoneNumber"
            />
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
    </Form>
  );
}
