/**
 * Building blocks shared by form schemas (react-hook-form + zodResolver) and the mock services
 * (`parseInput`). Only type-preserving transforms (trim / toLowerCase / overwrite) are used, so each
 * schema's input and output types are identical and forms stay simply typed.
 */
import { z } from "zod";

import { today } from "@/lib/datetime";

const MOBILE_RE = /^[6-9]\d{9}$/;

/** Strips spaces, dashes and a +91 / 91 / 0 prefix: '+91 99479-63408' → '9947963408'. */
function normalizeMobile(value: string): string {
  return value.replace(/[\s-]/g, "").replace(/^(?:\+?91|0)(?=\d{10}$)/, "");
}

export const mobileField = z
  .string()
  .overwrite(normalizeMobile)
  .regex(MOBILE_RE, { error: "Enter a valid 10-digit mobile number" });

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const passwordField = z
  .string()
  .min(8, { error: "Use at least 8 characters" })
  .max(64, { error: "Use at most 64 characters" });

export const personNameField = z
  .string()
  .trim()
  .min(2, { error: "Enter a name" })
  .max(60, { error: "Use at most 60 characters" })
  .regex(/^\p{L}[\p{L} .'-]*$/u, { error: "Use letters only" });

/** Stop names are compared case-insensitively everywhere. */
export function isSameStop(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export const placeNameField = z
  .string()
  .trim()
  .min(2, { error: "Enter a place name" })
  .max(40, { error: "Use at most 40 characters" });

/**
 * Starts with a letter or digit; then letters (with their accents / vowel signs), digits, spaces
 * and . , ' ( ) / - &
 */
const STOP_POINT_RE = /^[\p{L}\d][\p{L}\p{M}\d .,'()/&-]*$/u;

/**
 * A pickup or drop point typed by the customer, e.g. "Aluva Metro". Free text by design: people
 * board and get off anywhere along a bus's route, so it is never checked against a stop list.
 * `missingMessage` is shown when it is empty or too short.
 */
export function stopField(missingMessage: string) {
  return z
    .string()
    .trim()
    .min(2, { error: missingMessage })
    .max(60, { error: "Use at most 60 characters" })
    .regex(STOP_POINT_RE, { error: "Use letters, numbers, spaces and . , ' ( ) / - & only" });
}

export const isoDateField = z.iso.date({ error: "Pick a date" });

export const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Pick a time" });

/** A date that is today or later (IST). */
export const notPastDateField = isoDateField.refine((date) => date >= today(), {
  error: "Date cannot be in the past",
});

/** Id picked from a select. */
export function refIdField(label: string) {
  return z.string().min(1, { error: `Select a ${label}` });
}

export const optionalReasonField = z
  .string()
  .trim()
  .max(200, { error: "Use at most 200 characters" })
  .optional();
