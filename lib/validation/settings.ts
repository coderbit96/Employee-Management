import { z } from "zod";
import { normalizeHolidayDate } from "@/lib/dates/holiday-date";

const holidayDateSchema = z.string().trim().transform((value, context) => {
  const normalized = normalizeHolidayDate(value);
  if (!normalized) {
    context.addIssue({
      code: "custom",
      message: `Invalid holiday date: ${value}`,
    });
    return z.NEVER;
  }
  return normalized;
});

export const updateSettingsSchema = z.object({
  timezone: z.string().trim().min(1).optional(),
  fullDayMinutes: z.coerce.number().int().min(0).optional(),
  annualPaidLeaveDays: z.coerce.number().min(0).optional(),
  holidayDates: z.array(holidayDateSchema).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
