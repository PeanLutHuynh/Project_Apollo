"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { bulkEmailSchema, type BulkEmailFormValues } from "@/schemas/communication.schema";

interface Contact {
  id: string;
  fullName: string;
  email: string;
}

export default function BulkEmailForm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/contacts?pageSize=100")
      .then((r) => r.json())
      .then((data) => setContacts(data.data?.items ?? []));
  }, []);

  const form = useForm<BulkEmailFormValues>({
    resolver: zodResolver(bulkEmailSchema),
    defaultValues: { contactIds: [], subject: "", message: "" },
  });

  const selectedIds = form.watch("contactIds");

  function toggleAll() {
    if (selectedIds.length === contacts.length) {
      form.setValue("contactIds", [], { shouldValidate: true });
    } else {
      form.setValue(
        "contactIds",
        contacts.map((c) => c.id),
        { shouldValidate: true }
      );
    }
  }

  function toggleContact(id: string) {
    const current = form.getValues("contactIds");
    if (current.includes(id)) {
      form.setValue(
        "contactIds",
        current.filter((x) => x !== id),
        { shouldValidate: true }
      );
    } else {
      form.setValue("contactIds", [...current, id], { shouldValidate: true });
    }
  }

  async function onSubmit(values: BulkEmailFormValues) {
    setResult(null);
    const res = await fetch("/api/communication/bulk-email", {
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
      form.reset();
    } else {
      setResult({
        success: false,
        message: data.error ?? "Failed to send bulk email",
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
                  {selectedIds.length > 0 && (
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {selectedIds.length} selected
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
                        <Checkbox
                          checked={selectedIds.includes(contact.id)}
                          onCheckedChange={() => toggleContact(contact.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium flex-1">
                          {contact.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {contact.email}
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
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Enter email subject..." {...field} />
              </FormControl>
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
                  placeholder="Type your email message here..."
                  rows={6}
                  {...field}
                />
              </FormControl>
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
          disabled={form.formState.isSubmitting || selectedIds.length === 0}
          className="w-full sm:w-auto"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send to {selectedIds.length > 0 ? `${selectedIds.length} Contact${selectedIds.length !== 1 ? "s" : ""}` : "Contacts"}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
