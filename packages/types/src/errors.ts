export const SERVICE_ERROR_CODES = [
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "UNAUTHORIZED",
  "FORBIDDEN",
] as const;
export type ServiceErrorCode = (typeof SERVICE_ERROR_CODES)[number];

/** Machine-readable reason attached to an error, so the UI can react to specific cases. */
export const SERVICE_ERROR_REASONS = [
  "INVALID_CREDENTIALS",
  "ACCOUNT_DISABLED",
  "WRONG_PORTAL",
  "SESSION_INVALID",
  "EMAIL_TAKEN",
  "PAST_DATE",
  "RESOURCE_INACTIVE",
  "INVALID_TRANSITION",
  "HAS_UPCOMING_TRIPS",
  "BUS_NAME_TAKEN",
  "REGISTRATION_TAKEN",
  "CAPACITY_BELOW_BOOKINGS",
  "BUS_ROUTE_LOCKED",
  "TRIP_ON_HOLIDAY",
  "TRIP_ENDS_AFTER_MIDNIGHT",
  "BUS_BUSY",
  "DRIVER_BUSY",
  "TRIP_NOT_EDITABLE",
  "TRIP_LOCKED_FIELDS",
  "TRIP_BUS_ROUTE_MISMATCH",
  "TRIP_NOT_TODAY",
  "DRIVER_HAS_ACTIVE_TRIP",
  "TRIP_NOT_SCHEDULED",
  "TRIP_DEPARTED",
  "TRIP_FULL",
  "DUPLICATE_BOOKING",
  "BOOKING_NOT_CANCELLABLE",
  "CANCELLATION_CLOSED",
  "HOLIDAY_EXISTS",
  "HOLIDAY_HAS_TRIPS",
  "HOLIDAY_TRIP_IN_PROGRESS",
] as const;
export type ServiceErrorReason = (typeof SERVICE_ERROR_REASONS)[number];

/** Field name → human-readable message. */
export type FieldErrors = Partial<Record<string, string>>;

/** Wire shape of an error returned by a service (mock or API). */
export interface ServiceErrorPayload {
  code: ServiceErrorCode;
  /** Short, user-safe message. */
  message: string;
  reason?: ServiceErrorReason;
  fieldErrors?: FieldErrors;
  details?: unknown;
}
