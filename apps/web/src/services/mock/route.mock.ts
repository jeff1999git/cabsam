import "client-only";

import type { Route } from "@excelcabs/types";

import { nowIso, today } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";
import { pluralize } from "@/lib/format";
import { routeInputSchema, routeUpdateSchema } from "@/lib/schemas/route";
import { isSameStop } from "@/lib/schemas/common";

import { conflict, notFound, validation } from "../errors";
import type { RouteService } from "../route.service";
import { requireUser } from "./_session";
import { mockRead, mockWrite, newId, parseInput } from "./_utils";
import { toRouteWithUsage, usageIndex } from "./_views";

function byStops(a: Route, b: Route): number {
  return a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination);
}

function findRoute(db: Readonly<MockDb>, id: string): Route {
  const route = db.routes.find((candidate) => candidate.id === id);
  if (!route) throw notFound("Route");
  return route;
}

function assertUniquePair(db: Readonly<MockDb>, route: Pick<Route, "origin" | "destination">, exceptId?: string) {
  const duplicate = db.routes.find(
    (other) =>
      other.id !== exceptId &&
      isSameStop(other.origin, route.origin) &&
      isSameStop(other.destination, route.destination),
  );
  if (duplicate) {
    const message = `${duplicate.origin} → ${duplicate.destination} already exists`;
    throw conflict("ROUTE_EXISTS", message, { fieldErrors: { destination: message } });
  }
}

export const mockRouteService: RouteService = {
  listActive() {
    return mockRead((db) => db.routes.filter((route) => route.status === "active").toSorted(byStops));
  },

  list(query = {}) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      const usage = usageIndex(db, today());
      return db.routes
        .filter((route) => !query.status || route.status === query.status)
        .toSorted(byStops)
        .map((route) => toRouteWithUsage(usage, route));
    });
  },

  get(id) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      return toRouteWithUsage(usageIndex(db, today()), findRoute(db, id));
    });
  },

  create(input) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const values = parseInput(routeInputSchema, input);
      assertUniquePair(draft, values);
      const now = nowIso();
      const route: Route = { id: newId("rte"), ...values, createdAt: now, updatedAt: now };
      draft.routes.push(route);
      return route;
    });
  },

  update(id, patch) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const changes = parseInput(routeUpdateSchema, patch);
      const route = findRoute(draft, id);
      const next = { ...route, ...changes };
      if (isSameStop(next.origin, next.destination)) {
        throw validation({ destination: "Destination must differ from the origin" });
      }

      const usage = toRouteWithUsage(usageIndex(draft, today()), route);
      const stopsChanged = next.origin !== route.origin || next.destination !== route.destination;
      if (stopsChanged && usage.totalTripCount > 0) {
        throw conflict(
          "ROUTE_IN_USE",
          "This route already has trips, so its stops can't change. Add a new route instead.",
        );
      }
      if (stopsChanged) assertUniquePair(draft, next, route.id);
      if (route.status === "active" && next.status !== "active" && usage.upcomingTripCount > 0) {
        throw conflict(
          "HAS_UPCOMING_TRIPS",
          `${route.origin} → ${route.destination} has ${pluralize(usage.upcomingTripCount, "upcoming trip")} — cancel them first`,
          { details: { count: usage.upcomingTripCount } },
        );
      }

      Object.assign(route, changes, { updatedAt: nowIso() });
      return route;
    });
  },
};
