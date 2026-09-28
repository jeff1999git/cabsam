import type { Admin, Customer, ISODate, ISODateTime } from "@excelcabs/types";

import { DEMO_ACCOUNTS } from "@/config/demo";
import { addDays, istToEpoch, istToInstant } from "@/lib/datetime";

import { rngFor } from "./random";

const ADMIN_USER_ID = "usr_admin";
const DEMO_CUSTOMER_ID = "usr_customer_demo";
const TEST_CUSTOMER_ID = "usr_customer_test";
const SPAM_CUSTOMER_ID = "usr_customer_spam";

const MS_PER_MINUTE = 60_000;

function joinedAt(today: ISODate, daysAgo: number): string {
  return istToInstant(addDays(today, -daysAgo), "10:15");
}

export function buildAdmin(today: ISODate): Admin {
  const createdAt = joinedAt(today, 540);
  return {
    id: ADMIN_USER_ID,
    role: "admin",
    name: "Anitha Menon",
    email: DEMO_ACCOUNTS.admin.email,
    mobile: "9446012345",
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
}

export function buildDemoCustomer(today: ISODate): Customer {
  const createdAt = joinedAt(today, 210);
  return {
    id: DEMO_CUSTOMER_ID,
    role: "customer",
    name: "Arjun Nair",
    email: DEMO_ACCOUNTS.customer.email,
    mobile: "9895012345",
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
}

/** An obviously fake sign-up from earlier today with no bookings: the demo target for "Disable". */
export function buildTestCustomer(today: ISODate, seededAtMs: number): Customer {
  // Signed up this morning, but never after the moment the data was generated.
  const createdMs = Math.max(
    istToEpoch(today, "00:00"),
    Math.min(istToEpoch(today, "09:40"), seededAtMs - 25 * MS_PER_MINUTE),
  );
  const createdAt = new Date(createdMs).toISOString();
  return {
    id: TEST_CUSTOMER_ID,
    role: "customer",
    name: "Test Test",
    email: "test123@mailinator.com",
    mobile: "9999999999",
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
}

/** A spam sign-up from 3 days ago that the admin disabled at `disabledAt` (see bookings.ts). */
export function buildSpamCustomer(today: ISODate, disabledAt: ISODateTime): Customer {
  return {
    id: SPAM_CUSTOMER_ID,
    role: "customer",
    name: "Spam Account",
    email: "promo.offers@spam-mail.biz",
    mobile: "9000000001",
    status: "disabled",
    createdAt: joinedAt(today, 3),
    updatedAt: disabledAt,
  };
}

/** Regular riders who are always on today's 7:00 AM Shakthan Stand → SmartCity manifest. */
const FIXED_PASSENGERS = [
  { id: "usr_cus_surya", name: "Surya", mobile: "9947963408" },
  { id: "usr_cus_rahul", name: "Rahul", mobile: "9876543210" },
  { id: "usr_cus_anu", name: "Anu", mobile: "9847000000" },
] as const;

export function buildFixedPassengers(today: ISODate): Customer[] {
  return FIXED_PASSENGERS.map((passenger, index) => {
    const createdAt = joinedAt(today, 300 - index * 40);
    return {
      ...passenger,
      role: "customer",
      email: `${passenger.name.toLowerCase()}@example.com`,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    };
  });
}

const FIRST_NAMES = [
  "Meera", "Nikhil", "Aswathy", "Vishnu", "Anjali", "Akhil", "Devika", "Gokul", "Fathima",
  "Muhammed", "Reshma", "Jithin", "Keerthana", "Basil", "Christy", "Shahana", "Gayathri", "Aswin",
  "Lakshmi", "Sreejith", "Divya", "Anoop", "Athira", "Jerin", "Parvathy", "Midhun", "Sandra",
  "Faisal", "Aparna", "Kiran",
];

const SURNAMES = [
  "Nair", "Menon", "Pillai", "Thomas", "Joseph", "Varghese", "Kurian", "George", "Mathew",
  "Krishnan", "Rahman", "Antony", "Jacob", "Warrier", "Chacko",
];

const MOBILE_PREFIXES = ["98", "94", "97", "95", "96", "90", "80", "75", "70", "62"];

/** Generated customer accounts (unique names, emails and mobiles; stable across days). */
export function generateCustomers(
  today: ISODate,
  count: number,
  reservedMobiles: ReadonlySet<string>,
): Customer[] {
  const rng = rngFor("customers");
  const usedNames = new Set<string>();
  const usedMobiles = new Set(reservedMobiles);
  const customers: Customer[] = [];

  while (customers.length < count) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(SURNAMES);
    const name = `${first} ${last}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    let mobile: string;
    do {
      mobile = `${rng.pick(MOBILE_PREFIXES)}${String(rng.int(0, 99_999_999)).padStart(8, "0")}`;
    } while (usedMobiles.has(mobile));
    usedMobiles.add(mobile);

    const createdAt = joinedAt(today, rng.int(20, 420));
    customers.push({
      id: `usr_cus_${String(customers.length + 1).padStart(3, "0")}`,
      role: "customer",
      name,
      email: `${first}.${last}@example.com`.toLowerCase(),
      mobile,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    });
  }
  return customers;
}
