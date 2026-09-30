/** Calendar date in the operator's timezone (Asia/Kolkata), formatted `YYYY-MM-DD`. */
export type ISODate = string;

/** 24-hour wall-clock time in the operator's timezone, formatted `HH:mm`. */
export type TimeHM = string;

/** UTC instant, as produced by `Date#toISOString()`. */
export type ISODateTime = string;

/** Day of the week as `Date#getUTCDay` numbers it: 0 = Sunday … 6 = Saturday. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Unsubscribe = () => void;

/** 1-based pagination request. */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

/** Number of scheduled / in-progress trips dated today or later that reference the entity. */
export interface WithUsage {
  upcomingTripCount: number;
}
