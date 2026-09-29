import type { ISODate } from "@excelcabs/types";
import type { Route } from "next";

import { tripSearchSchema } from "@/lib/schemas/search";

/** Everything the home page reads from `/?date=…&trip=…&pickup=…&drop=…`. */
export interface HomeSearchParams {
  /** Travel date; missing, malformed or past dates fall back to today. */
  date?: string;
  /** The trip the person picked explicitly (used only while it is still bookable). */
  trip?: string;
  /** Free-text pickup point as typed ("Aluva Metro"). */
  pickup?: string;
  /** Free-text drop point as typed ("Kakkanad"). */
  drop?: string;
}

const HOME_PARAM_KEYS = ["date", "trip", "pickup", "drop"] as const;

function toQueryString(entries: ReadonlyArray<readonly [string, string | undefined]>): string {
  const query = new URLSearchParams();
  for (const [key, value] of entries) {
    const trimmed = value?.trim();
    if (trimmed) query.set(key, trimmed);
  }
  const search = query.toString();
  return search ? `?${search}` : "";
}

export function readHomeSearchParams(params: Pick<URLSearchParams, "get">): HomeSearchParams {
  const result: HomeSearchParams = {};
  for (const key of HOME_PARAM_KEYS) {
    const value = params.get(key);
    if (value) result[key] = value;
  }
  return result;
}

/** `/` with the given search as its query string (blank values are left out). */
export function homeHref(params: HomeSearchParams): Route {
  return `/${toQueryString(HOME_PARAM_KEYS.map((key) => [key, params[key]] as const))}` as Route;
}

/** The home page's travel date: the URL date when it is valid and not in the past, else `fallback`. */
export function resolveSearchDate(raw: string | undefined, fallback: ISODate): ISODate {
  const parsed = tripSearchSchema.safeParse({ date: raw });
  return parsed.success ? parsed.data.date : fallback;
}

/** `/book/<tripId>?pickup=…&drop=…`; blank stops are left out (the booking page asks for them). */
export function bookingHref(tripId: string, stops: { pickup?: string; drop?: string }): Route {
  return `/book/${encodeURIComponent(tripId)}${toQueryString([
    ["pickup", stops.pickup],
    ["drop", stops.drop],
  ])}` as Route;
}
