import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .max(200, 'That password is too long'),
  name: z.string().trim().min(1).max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;