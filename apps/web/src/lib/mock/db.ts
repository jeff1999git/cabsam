import type { Booking, Bus, Holiday, ISODate, Trip, TripSeries, User } from "@excelcabs/types";

/** Bump when the persisted shape changes; stored data with another version is reseeded. */
export const SCHEMA_VERSION = 4;

/** DEMO ONLY: plaintext password, kept apart from the user record like a real auth backend. */
export interface CredentialRecord {
  userId: string;
  password: string;
}

/** The whole mock database, persisted as one JSON document. */
export interface MockDb {
  schemaVersion: typeof SCHEMA_VERSION;
  /** IST date the data was generated for; stale data is reseeded. */
  seededOn: ISODate;
  users: User[];
  credentials: CredentialRecord[];
  buses: Bus[];
  /** Repeating trips; each of their trips is also in `trips` (with `seriesId`). */
  series: TripSeries[];
  trips: Trip[];
  bookings: Booking[];
  holidays: Holiday[];
}
