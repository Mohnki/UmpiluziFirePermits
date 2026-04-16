// Local copy of the Zod schemas from shared/schema.ts.
// Duplicated here because functions/ ships as its own package at build time.
import { z } from "zod";

export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: z.enum(["admin", "area-manager", "user", "api-user"]),
  createdAt: z.date(),
});

export const authRequestSchema = z.object({ idToken: z.string() });

export const permitStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled",
]);

export const permitQuerySchema = z.object({
  userId: z.string().optional(),
  areaId: z.string().optional(),
  status: permitStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  burnTypeId: z.string().optional(),
  compartment: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(5000).optional(),
  offset: z.number().min(0).optional(),
  includeHistorical: z.boolean().optional(),
});

export const areaQuerySchema = z.object({
  managerId: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().optional(),
    })
    .optional(),
  hasActiveBans: z.boolean().optional(),
  allowedBurnType: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type PermitQuery = z.infer<typeof permitQuerySchema>;
export type AreaQuery = z.infer<typeof areaQuerySchema>;

export interface BurnPermit {
  id: string;
  userId: string;
  farmId: string;
  burnTypeId: string;
  areaId: string;
  startDate: Date;
  endDate: Date;
  status: z.infer<typeof permitStatusSchema>;
  location?: { latitude: number; longitude: number; address?: string };
  details?: string;
  compartment?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Area {
  id: string;
  name: string;
  description: string;
  areaManagerId: string;
  location?: { latitude: number; longitude: number };
  allowedBurnTypes: Record<string, boolean>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface BurnType {
  id: string;
  name: string;
  description: string;
  defaultAllowed: boolean;
  requiresPermit: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
  isPublic: boolean;
  downloadCount: number;
  storagePath?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
