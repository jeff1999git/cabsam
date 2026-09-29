import type {
  BookingListQuery,
  BusListQuery,
  CustomerListQuery,
  DriverListQuery,
  HolidayListQuery,
  ISODate,
  MyBookingsQuery,
  MyTripsQuery,
  TripListQuery,
} from "@excelcabs/types";

/** First segment of every query key — the unit mutations invalidate (`meta.invalidates`). */
export type QueryDomain =
  | "auth"
  | "trips"
  | "bookings"
  | "buses"
  | "drivers"
  | "customers"
  | "holidays"
  | "dashboard";

/** Drops undefined / empty values so `{}` and `{ status: undefined }` share a cache entry. */
function clean<T extends object>(query: T | undefined): Partial<T> {
  return Object.fromEntries(
    Object.entries(query ?? {}).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  trips: {
    search: (date: ISODate | null) => ["trips", "search", date] as const,
    forBooking: (id: string) => ["trips", "for-booking", id] as const,
    list: (query?: TripListQuery) => ["trips", "list", clean(query)] as const,
    detail: (id: string) => ["trips", "detail", id] as const,
    passengers: (id: string) => ["trips", "passengers", id] as const,
    mine: (query?: MyTripsQuery) => ["trips", "mine", clean(query)] as const,
  },
  bookings: {
    mine: (query?: MyBookingsQuery) => ["bookings", "mine", clean(query)] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
    list: (query?: BookingListQuery) => ["bookings", "list", clean(query)] as const,
  },
  buses: {
    list: (query?: BusListQuery) => ["buses", "list", clean(query)] as const,
  },
  drivers: {
    list: (query?: DriverListQuery) => ["drivers", "list", clean(query)] as const,
  },
  customers: {
    list: (query?: CustomerListQuery) => ["customers", "list", clean(query)] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
  },
  holidays: {
    list: (query?: HolidayListQuery) => ["holidays", "list", clean(query)] as const,
    impact: (date: ISODate | null) => ["holidays", "impact", date] as const,
  },
  dashboard: {
    admin: () => ["dashboard", "admin"] as const,
  },
} as const satisfies Record<QueryDomain, object>;
