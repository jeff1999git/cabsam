/**
 * Date and time helpers for the operator's timezone (India Standard Time, UTC+05:30, no DST).
 *
 * Model: `ISODate` ('YYYY-MM-DD') and `TimeHM` ('HH:mm') are IST wall-clock strings. Business logic
 * compares them as strings (`dateTimeKey` sorts correctly) and never builds `Date`s from them.
 *
 * Pitfalls this module exists to avoid:
 * 1. `new Date('2026-09-24')` is UTC midnight (the 23rd west of UTC) while
 *    `new Date('2026-09-24T07:00')` is local time — never parse these strings with `Date`.
 * 2. `new Date().toISOString().slice(0, 10)` is the UTC date: "yesterday" in IST before 05:30.
 * 3. `Intl` / `toLocale*String` output differs between Node and browsers (e.g. U+202F before
 *    "AM"), which breaks hydration and string assertions — formatting here is hand-rolled.
 * 4. The presenter's device may not be in IST; the fixed offset makes behaviour identical anywhere.
 * 5. `Date.UTC` months are zero-based.
 * 6. `<input type="date">` yields '' or 'YYYY-MM-DD'; `<input type="time">` yields 24h 'HH:mm'.
 * 7. `today()` is impure: compute time-dependent flags in services, not during render.
 */
import type { ISODate, ISODateTime, TimeHM } from "@excelcabs/types";

const IST_OFFSET_MINUTES = 330;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_DAY = 1_440;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IstNow {
  date: ISODate;
  time: TimeHM;
  /** `dateTimeKey(date, time)` — compare with a trip's departure key. */
  key: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function nameAt(names: readonly string[], index: number): string {
  const name = names[index];
  if (name === undefined) throw new RangeError(`No name at index ${index}`);
  return name;
}

function parseDate(date: ISODate): { year: number; month: number; day: number } {
  const match = ISO_DATE_RE.exec(date);
  if (!match) throw new RangeError(`Invalid ISO date "${date}"`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTime(time: TimeHM): { hours: number; minutes: number } {
  const match = TIME_RE.exec(time);
  if (!match) throw new RangeError(`Invalid time "${time}"`);
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** Epoch ms of UTC midnight for the calendar date (used for day arithmetic only). */
function utcMidnight(date: ISODate): number {
  const { year, month, day } = parseDate(date);
  return Date.UTC(year, month - 1, day);
}

function isoDateOfUtc(value: Date): ISODate {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

/** IST calendar date and wall-clock time of an instant. */
function istParts(epochMs: number): { date: ISODate; time: TimeHM } {
  const shifted = new Date(epochMs + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    date: isoDateOfUtc(shifted),
    time: `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`,
  };
}

export function nowIst(): IstNow {
  const { date, time } = istParts(Date.now());
  return { date, time, key: dateTimeKey(date, time) };
}

/** Today's date in IST. */
export function today(): ISODate {
  return istParts(Date.now()).date;
}

/** Current instant as an ISO-8601 UTC string. */
export function nowIso(): ISODateTime {
  return new Date().toISOString();
}

export function instantToIst(iso: ISODateTime): { date: ISODate; time: TimeHM } {
  return istParts(Date.parse(iso));
}

/** Epoch ms of an IST wall-clock moment. */
export function istToEpoch(date: ISODate, time: TimeHM): number {
  const { hours, minutes } = parseTime(time);
  return utcMidnight(date) + (hours * 60 + minutes - IST_OFFSET_MINUTES) * MS_PER_MINUTE;
}

export function istToInstant(date: ISODate, time: TimeHM): ISODateTime {
  return new Date(istToEpoch(date, time)).toISOString();
}

/** True for a real calendar date in 'YYYY-MM-DD' form (rejects e.g. 2026-02-30). */
export function isValidISODate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isoDateOfUtc(new Date(Date.UTC(year, month - 1, day))) === value;
}

export function addDays(date: ISODate, days: number): ISODate {
  return isoDateOfUtc(new Date(utcMidnight(date) + days * MS_PER_DAY));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: ISODate): Weekday {
  return new Date(utcMidnight(date)).getUTCDay() as Weekday;
}

export function toMinutes(time: TimeHM): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

/** Minutes since midnight → 'HH:mm', wrapping past midnight. */
function minutesToTime(totalMinutes: number): TimeHM {
  const wrapped = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
}

export function addMinutes(time: TimeHM, minutes: number): { time: TimeHM; overflowsDay: boolean } {
  const total = toMinutes(time) + minutes;
  return { time: minutesToTime(total), overflowsDay: total > MINUTES_PER_DAY };
}

/** 'YYYY-MM-DDTHH:mm' — string-comparable across dates. */
export function dateTimeKey(date: ISODate, time: TimeHM): string {
  return `${date}T${time}`;
}

/** Whether departure minus `cutoffMinutes` is at or before now (IST). */
export function hasDeparted(
  date: ISODate,
  time: TimeHM,
  cutoffMinutes = 0,
  now: IstNow = nowIst(),
): boolean {
  const closesAt = istParts(istToEpoch(date, time) - cutoffMinutes * MS_PER_MINUTE);
  return dateTimeKey(closesAt.date, closesAt.time) <= now.key;
}

/** '24 Sep' */
export function formatDayMonth(date: ISODate): string {
  const { month, day } = parseDate(date);
  return `${day} ${nameAt(MONTHS, month - 1)}`;
}

/** 'Thu, 24 Sep' */
export function formatWeekdayDate(date: ISODate): string {
  return `${nameAt(WEEKDAYS, dayOfWeek(date))}, ${formatDayMonth(date)}`;
}

/** 'Thu, 24 Sep 2026' */
export function formatDateLong(date: ISODate): string {
  return `${formatWeekdayDate(date)} ${parseDate(date).year}`;
}

/** '7:00 AM' */
export function formatTime(time: TimeHM): string {
  const { hours, minutes } = parseTime(time);
  return `${hours % 12 || 12}:${pad2(minutes)} ${hours < 12 ? "AM" : "PM"}`;
}

/** '240926' — the date part of booking ids. */
export function formatDDMMYY(date: ISODate): string {
  const { year, month, day } = parseDate(date);
  return `${pad2(day)}${pad2(month)}${pad2(year % 100)}`;
}

/** 'Today' | 'Tomorrow' | '24 Sep' */
export function formatRelativeDay(date: ISODate, reference: ISODate = today()): string {
  const offset = diffDays(reference, date);
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return formatDayMonth(date);
}

/** '24 Sep, 10:42 AM' in IST. */
export function formatInstant(iso: ISODateTime): string {
  const { date, time } = instantToIst(iso);
  return `${formatDayMonth(date)}, ${formatTime(time)}`;
}

/** '2h', '1h 50m', '45m' */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
