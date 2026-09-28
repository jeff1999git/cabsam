import type { Admin, Customer, ISODate } from "@excelcabs/types";

import { DEMO_ACCOUNTS } from "@/config/demo";
import { addDays, istToInstant } from "@/lib/datetime";

import { rngFor } from "./random";

const ADMIN_USER_ID = "usr_admin";
const DEMO_CUSTOMER_ID = "usr_customer_demo";

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
