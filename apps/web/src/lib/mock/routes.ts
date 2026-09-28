import type { ISODate, Route } from "@excelcabs/types";

import { addDays, istToInstant } from "@/lib/datetime";

export const ROUTE_IDS = {
  shakthanToSmartCity: "rte_sks_smc",
  smartCityToShakthan: "rte_smc_sks",
  railwayToInfopark: "rte_tcr_ifp",
  infoparkToRailway: "rte_ifp_tcr",
  chalakudyToSmartCity: "rte_ckd_smc",
  smartCityToChalakudy: "rte_smc_ckd",
  guruvayurToShakthan: "rte_gvr_sks",
} as const;

const ROUTE_SEEDS: readonly Pick<Route, "id" | "origin" | "destination" | "durationMinutes" | "status">[] = [
  { id: ROUTE_IDS.shakthanToSmartCity, origin: "Shakthan Stand", destination: "SmartCity", durationMinutes: 120, status: "active" },
  { id: ROUTE_IDS.smartCityToShakthan, origin: "SmartCity", destination: "Shakthan Stand", durationMinutes: 120, status: "active" },
  { id: ROUTE_IDS.railwayToInfopark, origin: "Thrissur Railway Station", destination: "Infopark", durationMinutes: 110, status: "active" },
  { id: ROUTE_IDS.infoparkToRailway, origin: "Infopark", destination: "Thrissur Railway Station", durationMinutes: 110, status: "active" },
  { id: ROUTE_IDS.chalakudyToSmartCity, origin: "Chalakudy", destination: "SmartCity", durationMinutes: 90, status: "active" },
  { id: ROUTE_IDS.smartCityToChalakudy, origin: "SmartCity", destination: "Chalakudy", durationMinutes: 90, status: "active" },
  { id: ROUTE_IDS.guruvayurToShakthan, origin: "Guruvayur", destination: "Shakthan Stand", durationMinutes: 45, status: "inactive" },
];

export function buildRoutes(today: ISODate): Route[] {
  return ROUTE_SEEDS.map((route) => {
    const createdAt = istToInstant(addDays(today, -480), "09:30");
    return { ...route, createdAt, updatedAt: createdAt };
  });
}
