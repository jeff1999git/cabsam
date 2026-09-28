import "client-only";

import type { Driver, User } from "@excelcabs/types";

import { nowIso, today } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";
import { pluralize } from "@/lib/format";
import { driverCreateSchema, driverUpdateInputSchema } from "@/lib/schemas/driver";

import type { DriverService } from "../driver.service";
import { conflict, notFound } from "../errors";
import { requireUser } from "./_session";
import { mockRead, mockWrite, newId, parseInput } from "./_utils";
import { toDriverWithUsage, usageIndex } from "./_views";

function isDriver(user: User): user is Driver {
  return user.role === "driver";
}

function findDriver(db: Readonly<MockDb>, id: string): Driver {
  const driver = db.users.find((user) => user.id === id);
  if (!driver || !isDriver(driver)) throw notFound("Driver");
  return driver;
}

function assertEmailFree(db: Readonly<MockDb>, email: string, exceptId?: string) {
  if (db.users.some((user) => user.id !== exceptId && user.email === email)) {
    const message = "An account with this email already exists";
    throw conflict("EMAIL_TAKEN", message, { fieldErrors: { email: message } });
  }
}

export const mockDriverService: DriverService = {
  list(query = {}) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      const usage = usageIndex(db, today());
      const q = query.q?.trim().toLowerCase() ?? "";
      const digits = q.replace(/\D/g, "");
      return db.users
        .filter(isDriver)
        .filter((driver) => !query.status || driver.status === query.status)
        .filter(
          (driver) =>
            !q ||
            driver.name.toLowerCase().includes(q) ||
            driver.email.includes(q) ||
            (digits.length > 0 && driver.mobile.includes(digits)),
        )
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map((driver) => toDriverWithUsage(usage, driver));
    });
  },

  get(id) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      return toDriverWithUsage(usageIndex(db, today()), findDriver(db, id));
    });
  },

  create(input) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const { password, ...profile } = parseInput(driverCreateSchema, input);
      assertEmailFree(draft, profile.email);
      const now = nowIso();
      const driver: Driver = { id: newId("usr"), role: "driver", ...profile, createdAt: now, updatedAt: now };
      draft.users.push(driver);
      draft.credentials.push({ userId: driver.id, password });
      return driver;
    });
  },

  update(id, patch) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const { password, ...changes } = parseInput(driverUpdateInputSchema, patch);
      const driver = findDriver(draft, id);
      if (changes.email !== undefined) assertEmailFree(draft, changes.email, driver.id);

      const upcomingTripCount = toDriverWithUsage(usageIndex(draft, today()), driver).upcomingTripCount;
      const disabling = driver.status === "active" && changes.status === "disabled";
      if (disabling && upcomingTripCount > 0) {
        throw conflict(
          "HAS_UPCOMING_TRIPS",
          `${driver.name} has ${pluralize(upcomingTripCount, "upcoming trip")} — reassign or cancel them first`,
          { details: { count: upcomingTripCount } },
        );
      }

      Object.assign(driver, changes, { updatedAt: nowIso() });
      if (password !== undefined) {
        const credential = draft.credentials.find((record) => record.userId === driver.id);
        if (credential) credential.password = password;
        else draft.credentials.push({ userId: driver.id, password });
      }
      return driver;
    });
  },
};
