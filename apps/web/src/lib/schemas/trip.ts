/**
 * Trip schemas: the service inputs (`tripService.create` / `previewSchedule` / `update` / `cancel`)
 * and the admin trip form. The form asks for an arrival time and a One-time / Repeating choice;
 * `toCreateTripInput` / `toUpdateTripInput` turn its values into service input, and
 * `toTripScheduleInput` turns the schedule part into a `previewSchedule` request.
 *
 * Field names match the service's `fieldErrors` keys, except that the service reports the running
 * time on `durationMinutes`, which is the form's `arrivalTime`
 * (`applyServiceError(error, setError, { durationMinutes: "arrivalTime" })`).
 */
import {
  type CancelTripInput,
  type CreateTripInput,
  TRIP_CANCEL_SCOPES,
  type TripScheduleInput,
  type UpdateTripInput,
  type Weekday,
  WEEKDAYS,
} from "@excelcabs/types";
import { z } from "zod";

import { TRIP_DURATION_MINUTES, TRIP_REPEAT_MAX_DAYS } from "@/config/business";
import { addDays, dayOfWeek, isValidISODate, toMinutes } from "@/lib/datetime";

import {
  isoDateField,
  isSameStop,
  notPastDateField,
  optionalReasonField,
  refIdField,
  stopField,
  timeField,
} from "./common";

/** Shown when a trip is put on a Sunday (form and service). */
export const SUNDAY_NO_TRIPS_MESSAGE = "Sundays are holidays — no trips run";

/** The trip form's "Schedule" choice. */
export const TRIP_SCHEDULE_KINDS = ["once", "repeat"] as const;
export type TripScheduleKind = (typeof TRIP_SCHEDULE_KINDS)[number];

const MINUTES_PER_HOUR = 60;
const TOO_SHORT_MESSAGE = `A trip takes at least ${TRIP_DURATION_MINUTES.min} minutes`;
const TOO_LONG_MESSAGE = `A trip takes at most ${TRIP_DURATION_MINUTES.max / MINUTES_PER_HOUR} hours`;

const originField = stopField("Enter where the trip starts");
const destinationField = stopField("Enter where the trip ends");

const durationField = z
  .number({ error: "Enter the running time" })
  .int({ error: "Use whole minutes" })
  .min(TRIP_DURATION_MINUTES.min, { error: TOO_SHORT_MESSAGE })
  .max(TRIP_DURATION_MINUTES.max, { error: TOO_LONG_MESSAGE });

/** Days a repeating trip runs, stored sorted without duplicates (Sunday is rejected by the rules). */
const weekdaysField = z
  .array(z.literal(WEEKDAYS))
  .overwrite((days) => [...new Set(days)].toSorted((a, b) => a - b));

// ── Rules shared by the forms and the service ──────────────────────────────────────────────────
// Refinements also run when a field has already failed, so each rule skips values it can't read.

interface FieldIssue {
  path: string;
  message: string;
}

function report(ctx: z.RefinementCtx, issues: readonly FieldIssue[]): void {
  for (const { path, message } of issues) ctx.addIssue({ code: "custom", message, path: [path] });
}

function isSunday(date: string): boolean {
  return isValidISODate(date) && dayOfWeek(date) === 0;
}

function endpointIssues(values: { origin: string; destination: string }): FieldIssue[] {
  return isSameStop(values.origin, values.destination)
    ? [{ path: "destination", message: "Destination must differ from the origin" }]
    : [];
}

/** Weekdays non-empty and Mon–Sat; `until` from `date` to `date` + TRIP_REPEAT_MAX_DAYS. */
function repeatIssues(date: string, weekdays: readonly Weekday[], until: string): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (weekdays.length === 0) issues.push({ path: "weekdays", message: "Pick at least one day" });
  else if (weekdays.includes(0)) issues.push({ path: "weekdays", message: SUNDAY_NO_TRIPS_MESSAGE });
  if (isValidISODate(date) && isValidISODate(until)) {
    if (until < date) {
      issues.push({ path: "until", message: "Must be on or after the start date" });
    } else if (until > addDays(date, TRIP_REPEAT_MAX_DAYS)) {
      issues.push({ path: "until", message: `At most ${TRIP_REPEAT_MAX_DAYS} days after the start date` });
    }
  }
  return issues;
}

/** Minutes from departure to arrival on the same day, or null while either time is incomplete. */
function minutesBetween(departureTime: string, arrivalTime: string): number | null {
  const valid = timeField.safeParse(departureTime).success && timeField.safeParse(arrivalTime).success;
  return valid ? toMinutes(arrivalTime) - toMinutes(departureTime) : null;
}

function arrivalIssues(departureTime: string, arrivalTime: string): FieldIssue[] {
  const minutes = minutesBetween(departureTime, arrivalTime);
  if (minutes === null) return [];
  let message: string | null = null;
  if (minutes <= 0) message = "Arrival must be after departure (same day)";
  else if (minutes < TRIP_DURATION_MINUTES.min) message = TOO_SHORT_MESSAGE;
  else if (minutes > TRIP_DURATION_MINUTES.max) message = TOO_LONG_MESSAGE;
  return message ? [{ path: "arrivalTime", message }] : [];
}

// ── Service input ──────────────────────────────────────────────────────────────────────────────

const tripFieldsSchema = z.object({
  date: isoDateField,
  departureTime: timeField,
  durationMinutes: durationField,
  origin: originField,
  destination: destinationField,
  busId: refIdField("bus"),
  driverId: refIdField("driver"),
});

const tripRepeatSchema = z.object({ weekdays: weekdaysField, until: isoDateField });

function checkRepeat(values: TripScheduleInput, ctx: z.RefinementCtx): void {
  if (values.repeat) report(ctx, repeatIssues(values.date, values.repeat.weekdays, values.repeat.until));
}

/**
 * `tripService.previewSchedule`. Repeat issues are reported on `weekdays` / `until`, like the form's
 * fields.
 */
export const tripScheduleInputSchema = z
  .object({ date: isoDateField, repeat: tripRepeatSchema.optional() })
  .superRefine(checkRepeat) satisfies z.ZodType<TripScheduleInput>;

/**
 * `tripService.create`; origin ≠ destination is reported on `destination`, repeat issues on
 * `weekdays` / `until`. The service applies the date, Sunday / holiday and availability rules.
 */
export const tripInputSchema = tripFieldsSchema
  .extend({ repeat: tripRepeatSchema.optional() })
  .superRefine((values, ctx) => {
    report(ctx, endpointIssues(values));
    checkRepeat(values, ctx);
  }) satisfies z.ZodType<CreateTripInput>;

/** `tripService.update` patch; the service checks origin ≠ destination on the merged trip. */
export const tripUpdateSchema = tripFieldsSchema.partial() satisfies z.ZodType<UpdateTripInput>;

// ── Admin forms ────────────────────────────────────────────────────────────────────────────────

/** The trip form's trip fields. The running time is entered as `arrivalTime` (same day, after `departureTime`). */
const tripDetailsFormSchema = z.object({
  busId: refIdField("bus"),
  driverId: refIdField("driver"),
  origin: originField,
  destination: destinationField,
  date: notPastDateField,
  departureTime: timeField,
  arrivalTime: timeField,
});

type TripDetailsFormValues = z.output<typeof tripDetailsFormSchema>;

function checkTripDetails(values: TripDetailsFormValues, ctx: z.RefinementCtx): void {
  report(ctx, [...endpointIssues(values), ...arrivalIssues(values.departureTime, values.arrivalTime)]);
}

/**
 * The create form's schedule fields, refinement-free. `weekdays` and `until` only count when
 * `schedule` is "repeat" (keep them filled with defaults — Mon–Sat and date + TRIP_REPEAT_DEFAULT_DAYS
 * — so switching back and forth keeps the admin's choice).
 */
const tripScheduleFieldsSchema = z.object({
  schedule: z.enum(TRIP_SCHEDULE_KINDS),
  weekdays: weekdaysField,
  until: z.string(),
});

/** What `toTripScheduleInput` reads from the create form. */
export type TripScheduleFormValues = z.output<typeof tripScheduleFieldsSchema> & { date: string };

/** One-time: not a Sunday. Repeating: the start date may be a Sunday (it is simply not a weekday). */
function checkSchedule(values: TripScheduleFormValues, ctx: z.RefinementCtx): void {
  if (values.schedule === "once") {
    if (isSunday(values.date)) report(ctx, [{ path: "date", message: SUNDAY_NO_TRIPS_MESSAGE }]);
    return;
  }
  if (!isValidISODate(values.until)) report(ctx, [{ path: "until", message: "Pick an end date" }]);
  report(ctx, repeatIssues(values.date, values.weekdays, values.until));
}

/** Trip form fields, refinement-free (so `.pick` / `.omit` / `.partial` work): the trip plus the schedule. */
export const tripFormBaseSchema = tripDetailsFormSchema.extend(tripScheduleFieldsSchema.shape);

/**
 * Create / edit trip form: destination ≠ origin; arrival after departure within 15 min – 10 h; a
 * one-time date is not a Sunday; repeating needs at least one weekday (Mon–Sat) and "Repeat until"
 * from the start date to 90 days after it. Editing is always one trip (`schedule: "once"`).
 * Holidays, locked fields and clashes are checked by the service. `.extend()` keeps these rules.
 * Submit `toCreateTripInput(values)` or `toUpdateTripInput(values)`.
 */
export const tripFormSchema = tripFormBaseSchema.superRefine((values, ctx) => {
  checkTripDetails(values, ctx);
  checkSchedule(values, ctx);
});
export type TripFormValues = z.infer<typeof tripFormSchema>;

/** Arrival − departure, in minutes (the form has already checked arrival is later). */
function durationOf(values: Pick<TripDetailsFormValues, "departureTime" | "arrivalTime">): number {
  return toMinutes(values.arrivalTime) - toMinutes(values.departureTime);
}

/** Create form values → `tripService.create` input (`repeat` only for a repeating trip). */
export function toCreateTripInput(values: TripFormValues): CreateTripInput {
  return {
    date: values.date,
    departureTime: values.departureTime,
    durationMinutes: durationOf(values),
    origin: values.origin,
    destination: values.destination,
    busId: values.busId,
    driverId: values.driverId,
    ...(values.schedule === "repeat" ? { repeat: { weekdays: values.weekdays, until: values.until } } : {}),
  };
}

/** Form values → `tripService.update` patch for one trip (unchanged fields are ignored by the service). */
export function toUpdateTripInput(values: TripDetailsFormValues): UpdateTripInput {
  return {
    date: values.date,
    departureTime: values.departureTime,
    durationMinutes: durationOf(values),
    origin: values.origin,
    destination: values.destination,
    busId: values.busId,
    driverId: values.driverId,
  };
}

const tripSchedulePreviewSchema = tripScheduleFieldsSchema
  .extend({ date: isoDateField })
  .superRefine(checkSchedule);

/**
 * The create form's schedule (`schedule`, `date`, `weekdays`, `until` from `useWatch`) as a
 * `usePreviewSchedule` request, or null while it is incomplete or invalid. Pure — safe in render.
 */
export function toTripScheduleInput(values: TripScheduleFormValues): TripScheduleInput | null {
  const parsed = tripSchedulePreviewSchema.safeParse(values);
  if (!parsed.success) return null;
  const { schedule, date, weekdays, until } = parsed.data;
  return schedule === "repeat" ? { date, repeat: { weekdays, until } } : { date };
}

/** Cancel trip dialog and `tripService.cancel`. `scope` defaults to "trip". */
export const cancelTripSchema = z.object({
  reason: optionalReasonField,
  scope: z.enum(TRIP_CANCEL_SCOPES).optional(),
}) satisfies z.ZodType<CancelTripInput>;
