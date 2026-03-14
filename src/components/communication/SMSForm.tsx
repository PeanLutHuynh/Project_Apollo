"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Loader2, CheckCircle, XCircle } from "lucide-react";
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
import { sendSMSSchema, type SendSMSFormValues } from "@/schemas/communication.schema";
import { useRecipientSearch, type RecipientOption } from "@/hooks/use-recipient-search";

export default function SMSForm() {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const { query, setQuery, results, isLoading } = useRecipientSearch(50, isSuggestionsOpen);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientOption | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
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

  const form = useForm<SendSMSFormValues>({
    resolver: zodResolver(sendSMSSchema),
    defaultValues: { contactId: "", message: "" },
  });

  const message = useWatch({ control: form.control, name: "message" });

  async function onSubmit(values: SendSMSFormValues) {
    setResult(null);
    const res = await fetch("/api/communication/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setResult({ success: true, message: "SMS sent successfully!" });
      form.reset();
      setSelectedRecipient(null);
      setQuery("");
      setIsSuggestionsOpen(false);
    } else {
      setResult({
        success: false,
        message: data.error ?? "Failed to send SMS",
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
              <div ref={recipientBoxRef} className="space-y-2">
                <FormControl>
                  <Input
                    placeholder="Search recipient by name, phone, or email..."
                    value={query}
                    onFocus={() => setIsSuggestionsOpen(true)}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setIsSuggestionsOpen(true);
                    }}
                  />
                </FormControl>
                {isSuggestionsOpen && (
                  <div className="max-h-44 overflow-y-auto rounded-md border">
                    {isLoading ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
                    ) : results.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No matching recipients</p>
                    ) : (
                      results.map((recipient) => (
                        <button
                          key={recipient.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
                          onClick={() => {
                            field.onChange(recipient.id);
                            setSelectedRecipient(recipient);
                            setQuery(recipient.fullName);
                            setIsSuggestionsOpen(false);
                          }}
                        >
                          <span className="font-medium">{recipient.fullName}</span>
                          <span className="text-xs text-muted-foreground">{recipient.phoneNumber}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedRecipient && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedRecipient.fullName} ({selectedRecipient.phoneNumber})
                </p>
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
                  variant={message.length > 160 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {message.length}/160
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

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send SMS
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
