import { z } from "zod";

const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).optional(),
});

export const attendancePunchSchema = z.object({
  location: locationSchema.optional(),
  photoDataUrl: z
    .string()
    .trim()
    .max(150_000, "Photo preview is too large.")
    .optional(),
  breakDurationMinutes: z.coerce.number().int().min(0).max(720).default(0),
});

export type AttendancePunchInput = z.infer<typeof attendancePunchSchema>;

export const attendanceCorrectionSchema = z.object({
  checkInAt: z.coerce.date(),
  checkOutAt: z.coerce.date().optional(),
  reason: z.string().trim().min(10).max(1000),
}).refine((value) => !value.checkOutAt || value.checkOutAt > value.checkInAt, { message: "Check-out must be after check-in.", path: ["checkOutAt"] });

export const attendanceCorrectionDecisionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().min(3).max(500),
});
