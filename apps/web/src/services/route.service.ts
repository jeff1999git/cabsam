import type {
  CreateRouteInput,
  Route,
  RouteListQuery,
  RouteWithUsage,
  UpdateRouteInput,
} from "@excelcabs/types";

import { mockRouteService } from "./mock/route.mock";

export interface RouteService {
  /** Public. Active routes (for the From / To selects), sorted by origin then destination. */
  listActive(): Promise<Route[]>;
  /** Admin. */
  list(query?: RouteListQuery): Promise<RouteWithUsage[]>;
  /** Admin. @throws NOT_FOUND */
  get(id: string): Promise<RouteWithUsage>;
  /** Admin. @throws VALIDATION · CONFLICT(ROUTE_EXISTS) */
  create(input: CreateRouteInput): Promise<Route>;
  /**
   * Admin. Deactivate = `update(id, { status: "inactive" })`.
   * @throws NOT_FOUND · VALIDATION · CONFLICT(ROUTE_EXISTS | ROUTE_IN_USE | HAS_UPCOMING_TRIPS)
   */
  update(id: string, patch: UpdateRouteInput): Promise<Route>;
}

/** Swap point: replace with an API-backed implementation. */
export const routeService: RouteService = mockRouteService;
