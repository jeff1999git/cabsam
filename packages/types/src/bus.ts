import type { ISODateTime, WithUsage } from "./common";

/** Only `active` buses can be assigned to trips. */
export const BUS_STATUSES = ["active", "maintenance", "inactive"] as const;
export type BusStatus = (typeof BUS_STATUSES)[number];

export interface Bus {
  id: string;
  name: string;
  /** Canonical form, e.g. `KL-08-BE-7310`. Unique. */
  registrationNumber: string;
  capacity: number;
  status: BusStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type BusRef = Pick<Bus, "id" | "name" | "registrationNumber" | "capacity">;

export type BusWithUsage = Bus &
  WithUsage & {
    /** Highest booked-seat count across the bus's upcoming trips — the floor for capacity edits. */
    maxBookedOnUpcomingTrip: number;
  };

export interface BusListQuery {
  status?: BusStatus;
  q?: string;
}

export interface CreateBusInput {
  name: string;
  registrationNumber: string;
  capacity: number;
  status: BusStatus;
}

export type UpdateBusInput = Partial<CreateBusInput>;
