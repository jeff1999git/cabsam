import type { ISODate, TripListQuery, TripStatus, TripSummary } from "@excelcabs/types";
import type { Route } from "next";
import { z } from "zod";

import { addDays } from "@/lib/datetime";
import { isoDateField } from "@/lib/schemas/common";
import { parseSearchParams, tripFiltersSchema } from "@/lib/schemas/filters";

export const TRIP_VIEWS = ["upcoming", "date", "past"] as const;
export type TripView = (typeof TRIP_VIEWS)[number];

export const TRIP_VIEW_LABEL: Record<TripView, string> = {
  upcoming: "Upcoming",
  date: "Date",
  past: "Past",
};

const screenParamsSchema = z.object({
  view: z.enum(TRIP_VIEWS).optional().catch(undefined),
  date: isoDateField.optional().catch(undefined),
  create: z.string().optional().catch(undefined),
  trip: z.string().trim().min(1).optional().catch(undefined),
});

/** Everything the trips screen reads from `/admin/trips?view=…&date=…&busId=…&create=1&trip=…`. */
export interface TripsScreenParams {
  view: TripView;
  /** The day shown by the `date` view (today when the URL has none). */
  date: ISODate;
  busId?: string;
  driverId?: string;
  status?: TripStatus;
  /** `create=1` — the create dialog is open. */
  create: boolean;
  /** `trip=<id>` — the detail sheet is open for this trip. */
  tripId?: string;
}

export function readTripsParams(
  params: Pick<URLSearchParams, "entries">,
  todayDate: ISODate,
): TripsScreenParams {
  const own = parseSearchParams(screenParamsSchema, params);
  const { busId, driverId, status } = parseSearchParams(tripFiltersSchema, params);
  return {
    view: own.view ?? (own.date ? "date" : "upcoming"),
    date: own.date ?? todayDate,
    busId,
    driverId,
    status,
    create: own.create === "1",
    tripId: own.trip,
  };
}

export type TripsHrefParams = Partial<TripsScreenParams>;

/** `/admin/trips` with the given state as its query string (defaults are left out). */
export function tripsHref(params: TripsHrefParams): Route {
  const query = new URLSearchParams();
  if (params.view === "past") query.set("view", "past");
  if (params.view === "date" || (params.view === undefined && params.date)) {
    if (params.date) query.set("date", params.date);
  }
  if (params.busId) query.set("busId", params.busId);
  if (params.driverId) query.set("driverId", params.driverId);
  if (params.status) query.set("status", params.status);
  if (params.create) query.set("create", "1");
  if (params.tripId) query.set("trip", params.tripId);
  const search = query.toString();
  return (search ? `/admin/trips?${search}` : "/admin/trips") as Route;
}

/** The service query behind a view: upcoming = today onwards, date = that day, past = before today. */
export function tripListQuery(params: TripsScreenParams, todayDate: ISODate): TripListQuery {
  const { busId, driverId, status } = params;
  const shared = { busId, driverId, status };
  switch (params.view) {
    case "upcoming":
      return { ...shared, dateFrom: todayDate };
    case "date":
      return { ...shared, dateFrom: params.date, dateTo: params.date };
    case "past":
      return { ...shared, dateTo: addDays(todayDate, -1) };
  }
}

/** Whether a trip would appear in the list for these params (used to reveal a new trip). */
export function matchesTripsParams(
  trip: TripSummary,
  params: TripsScreenParams,
  todayDate: ISODate,
): boolean {
  const query = tripListQuery(params, todayDate);
  return (
    (!query.dateFrom || trip.date >= query.dateFrom) &&
    (!query.dateTo || trip.date <= query.dateTo) &&
    (!query.busId || trip.bus.id === query.busId) &&
    (!query.driverId || trip.driver.id === query.driverId) &&
    (!query.status || trip.status === query.status)
  );
}
