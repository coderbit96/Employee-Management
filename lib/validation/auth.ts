import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Email or login ID is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const activateAccountSchema = z.object({
  token: z.string().trim().min(20, "Activation token is invalid."),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number."),
});

export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password is required."),
  newPassword: z
    .string()
    .min(12, "New password must be at least 12 characters.")
    .regex(/[A-Z]/, "New password must include an uppercase letter.")
    .regex(/[a-z]/, "New password must include a lowercase letter.")
    .regex(/[0-9]/, "New password must include a number."),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, "Email or login ID is required."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "Reset token is invalid."),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number."),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
