import type { Bus, ISODate } from "@excelcabs/types";

import { addDays, istToInstant } from "@/lib/datetime";

export const BUS_IDS = {
  bus1: "bus_1",
  bus2: "bus_2",
  bus3: "bus_3",
  bus4: "bus_4",
  bus5: "bus_5",
  bus6: "bus_6",
} as const;

const BUS_SEEDS: readonly Pick<Bus, "id" | "name" | "registrationNumber" | "capacity" | "status">[] = [
  { id: BUS_IDS.bus1, name: "Bus 1", registrationNumber: "KL-08-BD-4521", capacity: 40, status: "active" },
  { id: BUS_IDS.bus2, name: "Bus 2", registrationNumber: "KL-08-BE-7310", capacity: 40, status: "active" },
  { id: BUS_IDS.bus3, name: "Bus 3", registrationNumber: "KL-07-CK-2208", capacity: 32, status: "active" },
  { id: BUS_IDS.bus4, name: "Bus 4", registrationNumber: "KL-08-AZ-9154", capacity: 26, status: "active" },
  // Spare bus with no trips, so "Disable" can be demonstrated.
  { id: BUS_IDS.bus5, name: "Bus 5", registrationNumber: "KL-07-DA-1186", capacity: 17, status: "active" },
  { id: BUS_IDS.bus6, name: "Bus 6", registrationNumber: "KL-08-BC-3302", capacity: 40, status: "maintenance" },
];

export function buildBuses(today: ISODate): Bus[] {
  return BUS_SEEDS.map((bus, index) => {
    const createdAt = istToInstant(addDays(today, -(500 - index * 30)), "09:00");
    return { ...bus, createdAt, updatedAt: createdAt };
  });
}
