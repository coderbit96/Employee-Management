import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Email or login ID is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

