import "client-only";

import type { Bus } from "@excelcabs/types";

import { nowIso, today } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";
import { pluralize } from "@/lib/format";
import { busInputSchema, busUpdateSchema } from "@/lib/schemas/bus";
import { isSameStop } from "@/lib/schemas/common";

import type { BusService } from "../bus.service";
import { conflict, notFound, validation } from "../errors";
import { requireUser } from "./_session";
import { mockRead, mockWrite, newId, parseInput } from "./_utils";
import { toBusWithUsage, usageIndex } from "./_views";

const compact = (value: string) => value.replace(/[\s-]/g, "").toLowerCase();

function byName(a: Bus, b: Bus): number {
  return a.name.localeCompare(b.name, "en", { numeric: true });
}

function findBus(db: Readonly<MockDb>, id: string): Bus {
  const bus = db.buses.find((candidate) => candidate.id === id);
  if (!bus) throw notFound("Bus");
  return bus;
}

function assertUnique(db: Readonly<MockDb>, bus: Pick<Bus, "name" | "registrationNumber">, exceptId?: string) {
  const others = db.buses.filter((other) => other.id !== exceptId);
  if (others.some((other) => other.name.toLowerCase() === bus.name.toLowerCase())) {
    const message = `${bus.name} already exists`;
    throw conflict("BUS_NAME_TAKEN", message, { fieldErrors: { name: message } });
  }
  if (others.some((other) => other.registrationNumber === bus.registrationNumber)) {
    const message = `${bus.registrationNumber} is already registered`;
    throw conflict("REGISTRATION_TAKEN", message, { fieldErrors: { registrationNumber: message } });
  }
}

export const mockBusService: BusService = {
  list(query = {}) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      const usage = usageIndex(db, today());
      const q = query.q ? compact(query.q) : "";
      return db.buses
        .filter((bus) => !query.status || bus.status === query.status)
        .filter((bus) => !q || compact(bus.name).includes(q) || compact(bus.registrationNumber).includes(q))
        .toSorted(byName)
        .map((bus) => toBusWithUsage(usage, bus));
    });
  },

  get(id) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      return toBusWithUsage(usageIndex(db, today()), findBus(db, id));
    });
  },

  create(input) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const values = parseInput(busInputSchema, input);
      assertUnique(draft, values);
      const now = nowIso();
      const bus: Bus = { id: newId("bus"), ...values, createdAt: now, updatedAt: now };
      draft.buses.push(bus);
      return bus;
    });
  },

  update(id, patch) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const changes = parseInput(busUpdateSchema, patch);
      const bus = findBus(draft, id);
      const next = { ...bus, ...changes };
      if (isSameStop(next.origin, next.destination)) {
        throw validation({ destination: "Destination must differ from the origin" });
      }
      assertUnique(draft, next, bus.id);

      const usage = toBusWithUsage(usageIndex(draft, today()), bus);
      const routeChanged = next.origin !== bus.origin || next.destination !== bus.destination;
      if (routeChanged && usage.totalTripCount > 0) {
        const message = `${bus.name} already has trips, so its route can't change. Add a new bus instead.`;
        throw conflict("BUS_ROUTE_LOCKED", message, { fieldErrors: { origin: message } });
      }
      if (next.capacity < usage.maxBookedOnUpcomingTrip) {
        const message = `An upcoming trip already has ${pluralize(usage.maxBookedOnUpcomingTrip, "booking")}`;
        throw conflict("CAPACITY_BELOW_BOOKINGS", message, { fieldErrors: { capacity: message } });
      }
      if (bus.status === "active" && next.status !== "active" && usage.upcomingTripCount > 0) {
        throw conflict(
          "HAS_UPCOMING_TRIPS",
          `${bus.name} has ${pluralize(usage.upcomingTripCount, "upcoming trip")} — reassign or cancel them first`,
          { details: { count: usage.upcomingTripCount } },
        );
      }

      Object.assign(bus, changes, { updatedAt: nowIso() });
      return bus;
    });
  },
};
