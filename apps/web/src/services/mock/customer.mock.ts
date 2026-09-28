import "client-only";

import type { Customer, User } from "@excelcabs/types";

import { nowIso, today } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";
import { customerStatusSchema } from "@/lib/schemas/customer";

import type { CustomerService } from "../customer.service";
import { notFound } from "../errors";
import { cancelCustomerBookings } from "./_rules";
import { requireUser } from "./_session";
import { mockRead, mockWrite, parseInput } from "./_utils";
import { customerStatsIndex, toCustomerWithStats } from "./_views";

const ACCOUNT_DISABLED_REASON = "Account disabled";

function isCustomer(user: User): user is Customer {
  return user.role === "customer";
}

function findCustomer(db: Readonly<MockDb>, id: string): Customer {
  const customer = db.users.find((user) => user.id === id);
  if (!customer || !isCustomer(customer)) throw notFound("User");
  return customer;
}

function newestFirst(a: Customer, b: Customer): number {
  return b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name);
}

export const mockCustomerService: CustomerService = {
  list(query = {}) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      const stats = customerStatsIndex(db, today());
      const q = query.q?.trim().toLowerCase() ?? "";
      const digits = q.replace(/\D/g, "");
      return db.users
        .filter(isCustomer)
        .filter((customer) => !query.status || customer.status === query.status)
        .filter(
          (customer) =>
            !q ||
            customer.name.toLowerCase().includes(q) ||
            customer.email.includes(q) ||
            (digits.length > 0 && customer.mobile.includes(digits)),
        )
        .toSorted(newestFirst)
        .map((customer) => toCustomerWithStats(stats, customer));
    });
  },

  get(id) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      return toCustomerWithStats(customerStatsIndex(db, today()), findCustomer(db, id));
    });
  },

  setStatus(id, input) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const { status, reason } = parseInput(customerStatusSchema, input);
      const customer = findCustomer(draft, id);
      if (customer.status === status) return { user: customer, cancelledBookings: 0 };

      const at = nowIso();
      // The account's live session ends by itself: `requireUser` rejects disabled users on their
      // next call (SESSION_INVALID), and the query client signs that tab out.
      const cancelledBookings =
        status === "disabled"
          ? cancelCustomerBookings(draft, customer.id, { reason: reason || ACCOUNT_DISABLED_REASON, source: "admin", at })
          : 0;
      Object.assign(customer, { status, updatedAt: at } satisfies Partial<Customer>);
      return { user: customer, cancelledBookings };
    });
  },
};
