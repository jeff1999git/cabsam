import type { ISODateTime, WithUsage } from "./common";

/** Only `active` buses can be assigned to trips. */
export const BUS_STATUSES = ["active", "maintenance", "inactive"] as const;
export type BusStatus = (typeof BUS_STATUSES)[number];

/**
 * A bus permanently serves one route: outbound trips run origin → destination and return trips
 * destination → origin, both taking `durationMinutes`.
 */
export interface Bus {
  id: string;
  name: string;
  /** Canonical form, e.g. `KL-08-BE-7310`. Unique. */
  registrationNumber: string;
  capacity: number;
  /** Boarding point of outbound trips, e.g. "Shakthan Stand". */
  origin: string;
  /** Drop point of outbound trips, e.g. "SmartCity". */
  destination: string;
  /** Estimated running time each way; snapshotted onto each trip when it is created. */
  durationMinutes: number;
  status: BusStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type BusRef = Pick<Bus, "id" | "name" | "registrationNumber" | "capacity">;

export type BusWithUsage = Bus &
  WithUsage & {
    /** Highest booked-seat count across the bus's upcoming trips — the floor for capacity edits. */
    maxBookedOnUpcomingTrip: number;
    /** Trips (any status) run by the bus. When > 0, origin/destination are locked. */
    totalTripCount: number;
  };

export interface BusListQuery {
  status?: BusStatus;
  q?: string;
}

export interface CreateBusInput {
  name: string;
  registrationNumber: string;
  capacity: number;
  origin: string;
  destination: string;
  durationMinutes: number;
  status: BusStatus;
}

export type UpdateBusInput = Partial<CreateBusInput>;
