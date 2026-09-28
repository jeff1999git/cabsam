import type {
  FieldErrors,
  ServiceErrorCode,
  ServiceErrorPayload,
  ServiceErrorReason,
} from "@excelcabs/types";

/**
 * The only error type services throw on purpose. `message` is always safe to show to people;
 * `reason` lets the UI react to specific cases and `fieldErrors` maps onto form fields.
 */
export class ServiceError extends Error implements ServiceErrorPayload {
  override readonly name = "ServiceError";
  readonly code: ServiceErrorCode;
  readonly reason?: ServiceErrorReason;
  readonly fieldErrors?: FieldErrors;
  readonly details?: unknown;

  constructor(payload: ServiceErrorPayload) {
    super(payload.message);
    this.code = payload.code;
    this.reason = payload.reason;
    this.fieldErrors = payload.fieldErrors;
    this.details = payload.details;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/** True when the error carries field-level messages (shown on the form rather than as a toast). */
export function hasFieldErrors(error: unknown): error is ServiceError & { fieldErrors: FieldErrors } {
  return isServiceError(error) && Object.keys(error.fieldErrors ?? {}).length > 0;
}

/** True for the error a service throws when the caller's session is missing or no longer valid. */
export function isSessionInvalid(error: unknown): boolean {
  return isServiceError(error) && error.code === "UNAUTHORIZED" && error.reason === "SESSION_INVALID";
}

/** User-facing text for any thrown value. */
export function errorMessage(error: unknown): string {
  return isServiceError(error) ? error.message : "Something went wrong. Please try again.";
}

export function notFound(entity: string): ServiceError {
  return new ServiceError({ code: "NOT_FOUND", message: `${entity} not found` });
}

export function validation(
  fieldErrors: FieldErrors,
  message = "Please fix the highlighted fields",
  reason?: ServiceErrorReason,
): ServiceError {
  return new ServiceError({ code: "VALIDATION", message, reason, fieldErrors });
}

export function conflict(
  reason: ServiceErrorReason,
  message: string,
  extra: { fieldErrors?: FieldErrors; details?: unknown } = {},
): ServiceError {
  return new ServiceError({ code: "CONFLICT", message, reason, ...extra });
}

export function unauthorized(
  reason: Extract<ServiceErrorReason, "INVALID_CREDENTIALS" | "SESSION_INVALID">,
  message: string,
): ServiceError {
  return new ServiceError({ code: "UNAUTHORIZED", message, reason });
}

export function forbidden(
  message = "You don't have access to this",
  reason?: ServiceErrorReason,
  details?: unknown,
): ServiceError {
  return new ServiceError({ code: "FORBIDDEN", message, reason, details });
}
