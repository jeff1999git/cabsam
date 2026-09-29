import type { ISODate, User } from "@excelcabs/types";

import { DEMO_PASSWORD } from "@/config/demo";

import { generateBookings } from "./bookings";
import { buildBuses } from "./buses";
import { type MockDb, SCHEMA_VERSION } from "./db";
import { buildDrivers } from "./drivers";
import { generateHolidays } from "./holidays";
import { generateTrips, operatingDays } from "./trips";
import {
  buildAdmin,
  buildDemoCustomer,
  buildFixedPassengers,
  buildSpamCustomer,
  buildTestCustomer,
  generateCustomers,
} from "./users";

const GENERATED_CUSTOMERS = 60;
/** The spam account was disabled (its booking cancelled) an hour before the data was generated. */
const SPAM_DISABLED_MINUTES_BEFORE_SEED = 60;
const MS_PER_MINUTE = 60_000;

/**
 * Builds the demo database for `today` (IST). Everything is deterministic for a given date;
 * `seededAtMs` only caps creation timestamps so nothing appears to be created in the future.
 */
export function createSeedDb(today: ISODate, seededAtMs: number): MockDb {
  const admin = buildAdmin(today);
  const demoCustomer = buildDemoCustomer(today);
  const fixedPassengers = buildFixedPassengers(today);
  const fixedCustomers = fixedPassengers.map((passenger) => passenger.customer);
  const testCustomer = buildTestCustomer(today, seededAtMs);
  const disabledAt = new Date(seededAtMs - SPAM_DISABLED_MINUTES_BEFORE_SEED * MS_PER_MINUTE).toISOString();
  const spamCustomer = buildSpamCustomer(today, disabledAt);
  const drivers = buildDrivers(today);
  const reservedMobiles = new Set(
    [admin, demoCustomer, ...fixedCustomers, testCustomer, spamCustomer, ...drivers].map((user) => user.mobile),
  );
  const customers = generateCustomers(today, GENERATED_CUSTOMERS, reservedMobiles);

  const buses = buildBuses(today);
  const holidays = generateHolidays(today);
  const days = operatingDays(today, new Set(holidays.map((holiday) => holiday.date)));
  const trips = generateTrips({ today, days, buses, seededAtMs });
  const bookings = generateBookings({
    today,
    seededAtMs,
    days,
    trips,
    buses,
    pool: [...customers, ...fixedCustomers],
    fixedPassengers,
    demoCustomer,
    disabledCustomer: { customer: spamCustomer, disabledAt },
  });

  const users: User[] = [
    admin,
    demoCustomer,
    ...fixedCustomers,
    testCustomer,
    spamCustomer,
    ...customers,
    ...drivers,
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    seededOn: today,
    users,
    credentials: users.map((user) => ({ userId: user.id, password: DEMO_PASSWORD })),
    buses,
    trips,
    bookings,
    holidays,
  };
}
