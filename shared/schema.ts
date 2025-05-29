import { z } from "zod";

// User and authentication schemas
export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: z.enum(['admin', 'area-manager', 'user', 'api-user']),
  createdAt: z.date(),
});

export const authRequestSchema = z.object({
  idToken: z.string(),
});

// Permit schemas
export const permitStatusSchema = z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']);

export const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
});

export const burnPermitSchema = z.object({
  id: z.string(),
  userId: z.string(),
  burnTypeId: z.string(),
  areaId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  status: permitStatusSchema,
  location: locationSchema,
  details: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const permitQuerySchema = z.object({
  userId: z.string().optional(),
  areaId: z.string().optional(),
  status: permitStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// Area and burn type schemas
export const areaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  areaManagerId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  allowedBurnTypes: z.record(z.boolean()),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
});

export const burnTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  defaultAllowed: z.boolean(),
  requiresPermit: z.boolean(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
});

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Type exports
export type UserProfile = z.infer<typeof userProfileSchema>;
export type AuthRequest = z.infer<typeof authRequestSchema>;
export type BurnPermit = z.infer<typeof burnPermitSchema>;
export type PermitQuery = z.infer<typeof permitQuerySchema>;
export type Area = z.infer<typeof areaSchema>;
export type BurnType = z.infer<typeof burnTypeSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
