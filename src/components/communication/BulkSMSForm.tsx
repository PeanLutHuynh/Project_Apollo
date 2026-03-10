"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Loader2, CheckCircle, XCircle, Users } from "lucide-react";
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

interface Contact {
  id: string;
  fullName: string;
  phoneNumber: string;
}

export default function BulkSMSForm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/contacts?pageSize=100")
      .then((r) => r.json())
      .then((data) => setContacts(data.data?.items ?? []));
  }, []);

  const form = useForm<BulkSMSFormValues>({
    resolver: zodResolver(bulkSMSSchema),
    defaultValues: { contactIds: [], message: "" },
  });

  const selectedCount = selectedIds.length;

  function toggleAll() {
    const newVal = selectedIds.length === contacts.length ? [] : contacts.map((c) => c.id);
    setSelectedIds(newVal);
    form.setValue("contactIds", newVal, { shouldValidate: true });
  }

  function toggleContact(id: string) {
    const newVal = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIds(newVal);
    form.setValue("contactIds", newVal, { shouldValidate: true });
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
      form.reset();
    } else {
      setResult({
        success: false,
        message: data.error ?? "Failed to send bulk SMS",
      });
    }
  }

  const allSelected = contacts.length > 0 && selectedIds.length === contacts.length;

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
                    disabled={contacts.length === 0}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </div>
              <div className="h-48 overflow-y-auto rounded-md border p-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No contacts found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {contacts.map((contact) => (
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
    </Form>
  );
}
