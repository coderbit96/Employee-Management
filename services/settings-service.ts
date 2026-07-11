import { OrganizationSettings } from "@/models/OrganizationSettings";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { UpdateSettingsInput } from "@/lib/validation/settings";
import type { SafeUser } from "@/types/domain";

type RequestContext = {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export class SettingsServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function getOrganizationSettings(actor: SafeUser) {
  await connectToDatabase();

  if (!["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(actor.role)) {
    throw new SettingsServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot view organization settings.",
      403,
    );
  }

  const settings = await getOrCreateSettings();

  return { settings: toSettings(settings) };
}

export async function updateOrganizationSettings(
  input: UpdateSettingsInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (actor.role !== "SUPER_ADMIN" && !actor.permissions.includes("MANAGE_SETTINGS")) {
    throw new SettingsServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only the Super Admin can update organization settings.",
      403,
    );
  }

  const settings = await getOrCreateSettings();

  if (input.timezone !== undefined) settings.timezone = input.timezone;
  if (input.fullDayMinutes !== undefined) {
    settings.fullDayMinutes = input.fullDayMinutes;
  }
  if (input.annualPaidLeaveDays !== undefined) {
    settings.annualPaidLeaveDays = input.annualPaidLeaveDays;
  }
  if (input.holidayDates !== undefined) settings.holidayDates = input.holidayDates;
  await settings.save();

  await writeAuditLog({
    actor,
    action: "ORGANIZATION_SETTINGS_UPDATED",
    entityType: "OrganizationSettings",
    entityId: settings._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: { fields: Object.keys(input) },
  });

  return { settings: toSettings(settings) };
}

export async function getPolicySettings() {
  await connectToDatabase();
  const settings = await getOrCreateSettings();
  return toSettings(settings);
}

async function getOrCreateSettings() {
  return OrganizationSettings.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, returnDocument: "after" },
  );
}

function toSettings(settings: {
  timezone?: string | null;
  fullDayMinutes?: number | null;
  annualPaidLeaveDays?: number | null;
  holidayDates?: string[] | null;
}) {
  return {
    timezone: settings.timezone ?? "Asia/Kolkata",
    fullDayMinutes: settings.fullDayMinutes ?? 480,
    annualPaidLeaveDays: settings.annualPaidLeaveDays ?? 18,
    holidayDates: settings.holidayDates ?? [],
  };
}
