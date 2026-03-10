"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendEmailSchema, type SendEmailFormValues } from "@/schemas/communication.schema";

interface Contact {
  id: string;
  fullName: string;
  email: string;
}

export default function EmailForm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/contacts?pageSize=100")
      .then((r) => r.json())
      .then((data) => setContacts(data.data?.items ?? []));
  }, []);

  const form = useForm<SendEmailFormValues>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: { contactId: "", subject: "", message: "" },
  });

  async function onSubmit(values: SendEmailFormValues) {
    setResult(null);
    const res = await fetch("/api/communication/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setResult({ success: true, message: "Email sent successfully!" });
      form.reset();
    } else {
      setResult({
        success: false,
        message: data.error ?? "Failed to send email",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-medium">{c.fullName}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
