import { z } from "zod";

export const createContactSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be under 100 characters"),
  address: z
    .string()
    .max(255, "Address must be under 255 characters")
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Phone must be a valid international number (e.g. +84xxxxxxxxx)"
    ),
  email: z.string().email("Must be a valid email address"),
  customerType: z.enum(["enterprise", "personal", "partner"], {
    errorMap: () => ({ message: "Customer type is required" }),
  }),
  contactSource: z.enum(["facebook", "zalo", "staff", "other"], {
    errorMap: () => ({ message: "Contact source is required" }),
  }),
  notes: z
    .string()
    .max(1000, "Notes must be under 1000 characters")
    .optional()
    .or(z.literal("")),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactFormValues = z.infer<typeof createContactSchema>;
export type UpdateContactFormValues = z.infer<typeof updateContactSchema>;
