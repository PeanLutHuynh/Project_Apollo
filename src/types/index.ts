import "next-auth";
import "next-auth/jwt";
import type { CommunicationType, CommunicationStatus } from "@prisma/client";

export type CustomerType = "enterprise" | "personal" | "partner";
export type ContactSource = "facebook" | "zalo" | "staff" | "other";

// Extend NextAuth session to include id and role
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

// ─── Contact Types ────────────────────────────────────────────────────────────

export interface ContactDTO {
  id: string;
  userId: string;
  fullName: string;
  customerType: CustomerType;
  contactSource: ContactSource;
  address: string | null;
  phoneNumber: string;
  email: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateContactInput = Pick<
  ContactDTO,
  | "fullName"
  | "customerType"
  | "contactSource"
  | "address"
  | "phoneNumber"
  | "email"
  | "notes"
>;
export type UpdateContactInput = Partial<CreateContactInput>;

// ─── Communication Types ──────────────────────────────────────────────────────

export interface CommunicationDTO {
  id: string;
  userId: string;
  contactId: string;
  contact?: { fullName: string; phoneNumber: string; email: string };
  type: CommunicationType;
  recipient: string;
  subject: string | null;
  message: string;
  status: CommunicationStatus;
  errorMsg: string | null;
  createdAt: Date;
}

export type SendSMSInput = {
  contactId: string;
  message: string;
};

export type SendEmailInput = {
  contactId: string;
  subject: string;
  message: string;
};

export type BulkSMSInput = {
  contactIds: string[];
  message: string;
};

export type BulkEmailInput = {
  contactIds: string[];
  subject: string;
  message: string;
};

export interface BulkSendResult {
  sent: number;
  failed: number;
  results: CommunicationDTO[];
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Record<string, unknown>;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
