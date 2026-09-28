import type { ISODate, TripSearchQuery } from "@excelcabs/types";
import type { Route } from "next";

import { isValidISODate } from "@/lib/datetime";
import { isSameStop } from "@/lib/schemas/common";
import type { RouteNetwork } from "@/queries/routes";

/** Date / pickup / destination of a trip search (the home page keeps it in its URL). */
export type TripSearchState = TripSearchQuery;

/** Everything the home page reads from `/?date=…&from=…&to=…&trip=…`. */
export interface HomeSearchParams extends Partial<TripSearchState> {
  /** The trip the person picked explicitly (kept only while it is still bookable). */
  trip?: string;
}

const PARAM_KEYS = ["date", "from", "to", "trip"] as const;

export function readHomeSearchParams(params: Pick<URLSearchParams, "get">): HomeSearchParams {
  const result: HomeSearchParams = {};
  for (const key of PARAM_KEYS) {
    const value = params.get(key);
    if (value) result[key] = value;
  }
  return result;
}

/** `/` with the given search state as its query string (empty values are left out). */
export function homeHref(params: HomeSearchParams): Route {
  const query = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  const search = query.toString();
  return search ? `/?${search}` : "/";
}

function pickStop(options: readonly string[], wanted: string | undefined): string | undefined {
  const match = wanted === undefined ? undefined : options.find((option) => isSameStop(option, wanted));
  return match ?? options[0];
}

/**
 * Fills a partial or stale search with defaults: `minDate` (today) when the date is missing or in
 * the past, the first boarding point and its first destination when the stops are unknown.
 * `null` until the route network has loaded, or when no route is active.
 */
export function resolveTripSearch(
  raw: Partial<TripSearchState>,
  network: RouteNetwork | undefined,
  minDate: ISODate,
): TripSearchState | null {
  if (!network) return null;
  const from = pickStop(network.origins, raw.from);
  if (from === undefined) return null;
  const to = pickStop(network.destinationsByOrigin[from] ?? [], raw.to);
  if (to === undefined) return null;
  const date = raw.date && isValidISODate(raw.date) && raw.date >= minDate ? raw.date : minDate;
  return { date, from, to };
}

/** Whether the reverse route (destination → pickup) is also served. */
export function canSwapStops(network: RouteNetwork, search: TripSearchState): boolean {
  return (network.destinationsByOrigin[search.to] ?? []).some((stop) => isSameStop(stop, search.from));
}
