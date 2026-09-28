/** Minutes before departure at which booking closes (0 = bookable until departure). */
export const BOOKING_CUTOFF_MINUTES = 0;

/** Buffer after a trip's arrival before its bus or driver can start another trip. */
export const TURNAROUND_MINUTES = 15;

export const BUS_CAPACITY = { min: 10, max: 60 } as const;

/** Each-way running time of a bus's route. */
export const ROUTE_DURATION_MINUTES = { min: 15, max: 300 } as const;

export const BOOKINGS_PAGE_SIZE = { default: 20, max: 100 } as const;

/** Number of bookings listed under "Recent bookings" on the admin dashboard. */
export const RECENT_BOOKINGS_LIMIT = 8;

/**
 * Stops the trip search opens on when the visitor has not chosen any — the operator's main
 * corridor. Falls back to the first served route when no active bus runs it.
 */
export const DEFAULT_SEARCH_STOPS = { from: "Shakthan Stand", to: "SmartCity" } as const;
