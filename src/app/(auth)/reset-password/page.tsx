"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Lock, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const token = searchParams.get("token") ?? "";

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let mounted = true;

    async function verifyToken() {
      if (!token) {
        if (mounted) {
          setTokenStatus("invalid");
          setTokenError("Reset token is missing.");
        }
        return;
      }

      const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!mounted) {
        return;
      }

      if (!res.ok || !data.success) {
        setTokenStatus("invalid");
        setTokenError(data.error ?? "Reset link is invalid.");
        return;
      }

      setTokenStatus("valid");
      setTokenError(null);
    }

    verifyToken();

    return () => {
      mounted = false;
    };
  }, [token]);

  async function onSubmit(values: ResetPasswordValues) {
    setSubmitError(null);
    setSubmitMessage(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: values.newPassword }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      setSubmitError(data.error ?? "Unable to reset password.");
      return;
    }

    setSubmitMessage(data.message ?? "Password reset successful.");
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2">
            <Phone className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold text-foreground">Apollo</span>
          </div>
        </div>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>Set a new password for your account</CardDescription>
      </CardHeader>

      <CardContent>
        {tokenStatus === "checking" ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying reset link...
          </div>
        ) : tokenStatus === "invalid" ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{tokenError ?? "Reset link is invalid."}</p>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Request a new reset link
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError && <p className="text-sm text-destructive text-center">{submitError}</p>}
              {submitMessage && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">{submitMessage}</p>
              )}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
