import { z } from "zod";

export const sendSMSSchema = z.object({
  contactId: z.string().uuid("Must select a valid contact"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(160, "SMS message cannot exceed 160 characters"),
});

export const sendEmailSchema = z.object({
  contactId: z.string().uuid("Must select a valid contact"),
  subject: z
    .string()
    .min(1, "Subject cannot be empty")
    .max(200, "Subject must be under 200 characters"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be under 5000 characters"),
});

export const bulkSMSSchema = z.object({
  contactIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one contact"),
  message: z
    .string()
    .min(1)
    .max(160, "SMS message cannot exceed 160 characters"),
});

export const bulkEmailSchema = z.object({
  contactIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one contact"),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export type SendSMSFormValues = z.infer<typeof sendSMSSchema>;
export type SendEmailFormValues = z.infer<typeof sendEmailSchema>;
export type BulkSMSFormValues = z.infer<typeof bulkSMSSchema>;
export type BulkEmailFormValues = z.infer<typeof bulkEmailSchema>;
