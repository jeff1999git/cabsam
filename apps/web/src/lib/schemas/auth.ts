import { type SignInInput, type SignUpInput, USER_ROLES } from "@excelcabs/types";
import { z } from "zod";

import { emailField, mobileField, passwordField, personNameField } from "./common";

/** Sign-in form (all three portals). */
export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Enter your password" }),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signInInputSchema = signInSchema.extend({
  portal: z.enum(USER_ROLES),
}) satisfies z.ZodType<SignInInput>;

export const signUpInputSchema = z.object({
  name: personNameField,
  email: emailField,
  mobile: mobileField,
  password: passwordField,
}) satisfies z.ZodType<SignUpInput>;

/** Customer sign-up form; submit `signUpInputSchema`'s fields (drop `confirmPassword`). */
export const signUpFormSchema = signUpInputSchema
  .extend({ confirmPassword: z.string().min(1, { error: "Confirm your password" }) })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
