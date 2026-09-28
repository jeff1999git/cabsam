import type { AccountStatus, Driver, ISODate } from "@excelcabs/types";

import { DEMO_ACCOUNTS } from "@/config/demo";
import { addDays, istToInstant } from "@/lib/datetime";

export const DRIVER_IDS = {
  biju: "usr_drv_biju",
  suresh: "usr_drv_suresh",
  anil: "usr_drv_anil",
  pradeep: "usr_drv_pradeep",
  shaji: "usr_drv_shaji",
  manoj: "usr_drv_manoj",
} as const;

interface DriverSeed {
  id: string;
  name: string;
  email: string;
  mobile: string;
  status: AccountStatus;
  joinedDaysAgo: number;
}

const DRIVER_SEEDS: readonly DriverSeed[] = [
  // The demo driver: 7:00 AM and 5:30 PM Shakthan Stand ⇄ SmartCity on Bus 2.
  { id: DRIVER_IDS.biju, name: "Biju Thomas", email: DEMO_ACCOUNTS.driver.email, mobile: "9847123456", status: "active", joinedDaysAgo: 480 },
  { id: DRIVER_IDS.suresh, name: "Suresh Kumar", email: "suresh.kumar@excelcabs.com", mobile: "9846234567", status: "active", joinedDaysAgo: 450 },
  { id: DRIVER_IDS.anil, name: "Anil Joseph", email: "anil.joseph@excelcabs.com", mobile: "9745345678", status: "active", joinedDaysAgo: 400 },
  { id: DRIVER_IDS.pradeep, name: "Pradeep Nair", email: "pradeep.nair@excelcabs.com", mobile: "9656456789", status: "active", joinedDaysAgo: 320 },
  // Spare driver with no trips, so "Disable" can be demonstrated.
  { id: DRIVER_IDS.shaji, name: "Shaji Paul", email: "shaji.paul@excelcabs.com", mobile: "9895567890", status: "active", joinedDaysAgo: 150 },
  { id: DRIVER_IDS.manoj, name: "Manoj Varghese", email: "manoj.varghese@excelcabs.com", mobile: "9447678901", status: "disabled", joinedDaysAgo: 600 },
];

export function buildDrivers(today: ISODate): Driver[] {
  return DRIVER_SEEDS.map(({ joinedDaysAgo, ...driver }) => {
    const createdAt = istToInstant(addDays(today, -joinedDaysAgo), "11:00");
    return { ...driver, role: "driver", createdAt, updatedAt: createdAt };
  });
}
