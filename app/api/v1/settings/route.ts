import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { updateSettingsSchema } from "@/lib/validation/settings";
import {
  getOrganizationSettings,
  SettingsServiceError,
  updateOrganizationSettings,
} from "@/services/settings-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  try {
    const data = await getOrganizationSettings(currentUser);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("SETTINGS_FAILED", "Unable to load settings.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await updateOrganizationSettings(
      parsed.data,
      currentUser,
      context,
    );
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("SETTINGS_UPDATE_FAILED", "Unable to update settings.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
