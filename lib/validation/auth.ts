import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Email or login ID is required."),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, "Email or login ID is required."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "Reset token is invalid."),
  password: z.string(),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
