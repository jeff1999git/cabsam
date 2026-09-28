import type { ISODateTime, WithUsage } from "./common";

export const ROUTE_STATUSES = ["active", "inactive"] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

export interface Route {
  id: string;
  /** Boarding point, e.g. "Shakthan Stand". */
  origin: string;
  /** Drop point, e.g. "SmartCity". */
  destination: string;
  /** Estimated running time; snapshotted onto each trip when it is created. */
  durationMinutes: number;
  status: RouteStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type RouteRef = Pick<Route, "id" | "origin" | "destination">;

export type RouteWithUsage = Route &
  WithUsage & {
    /** Trips (any status) referencing the route. When > 0, origin/destination are locked. */
    totalTripCount: number;
  };

export interface RouteListQuery {
  status?: RouteStatus;
}

export interface CreateRouteInput {
  origin: string;
  destination: string;
  durationMinutes: number;
  status: RouteStatus;
}

export type UpdateRouteInput = Partial<CreateRouteInput>;
