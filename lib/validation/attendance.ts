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
});

export type AttendancePunchInput = z.infer<typeof attendancePunchSchema>;
