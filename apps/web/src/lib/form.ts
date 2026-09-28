import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

import { isServiceError } from "@/services/errors";

/**
 * Shows a service error's `fieldErrors` on the matching react-hook-form fields (the first one gets
 * focus). Form field names match the DTO field names; pass `fieldMap` where they differ, e.g.
 * `{ registrationNumber: "registration" }`.
 *
 * Returns whether any field error was applied. Errors without `fieldErrors` are left alone: the
 * global mutation handler already reports them as a toast.
 */
export function applyServiceError<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fieldMap: Partial<Record<string, FieldPath<TValues>>> = {},
): boolean {
  if (!isServiceError(error) || !error.fieldErrors) return false;
  let applied = false;
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (!message) continue;
    const name = fieldMap[field] ?? (field as FieldPath<TValues>);
    setError(name, { type: "server", message }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}
