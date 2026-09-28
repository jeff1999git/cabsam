import type { ISODate, User } from "@excelcabs/types";

import { DEMO_PASSWORD } from "@/config/demo";

import { generateBookings } from "./bookings";
import { buildBuses } from "./buses";
import { type MockDb, SCHEMA_VERSION } from "./db";
import { buildDrivers } from "./drivers";
import { generateHolidays } from "./holidays";
import { buildRoutes } from "./routes";
import { generateTrips, operatingDays } from "./trips";
import { buildAdmin, buildDemoCustomer, buildFixedPassengers, generateCustomers } from "./users";

const GENERATED_CUSTOMERS = 60;

/**
 * Builds the demo database for `today` (IST). Everything is deterministic for a given date;
 * `seededAtMs` only caps creation timestamps so nothing appears to be created in the future.
 */
export function createSeedDb(today: ISODate, seededAtMs: number): MockDb {
  const admin = buildAdmin(today);
  const demoCustomer = buildDemoCustomer(today);
  const fixedPassengers = buildFixedPassengers(today);
  const drivers = buildDrivers(today);
  const reservedMobiles = new Set(
    [admin, demoCustomer, ...fixedPassengers, ...drivers].map((user) => user.mobile),
  );
  const customers = generateCustomers(today, GENERATED_CUSTOMERS, reservedMobiles);

  const routes = buildRoutes(today);
  const buses = buildBuses(today);
  const holidays = generateHolidays(today);
  const days = operatingDays(today, new Set(holidays.map((holiday) => holiday.date)));
  const trips = generateTrips({ today, days, routes, seededAtMs });
  const bookings = generateBookings({
    today,
    seededAtMs,
    days,
    trips,
    buses,
    pool: [...customers, ...fixedPassengers],
    fixedPassengers,
    demoCustomer,
  });

  const users: User[] = [admin, demoCustomer, ...fixedPassengers, ...customers, ...drivers];
  return {
    schemaVersion: SCHEMA_VERSION,
    seededOn: today,
    users,
    credentials: users.map((user) => ({ userId: user.id, password: DEMO_PASSWORD })),
    routes,
    buses,
    trips,
    bookings,
    holidays,
  };
}
