import type { Bus } from "@excelcabs/types";

const NUMBERED_BUS_NAME = /^Bus (\d+)$/i;

/**
 * The next free "Bus N" for a new bus: one more than the highest N among names like "Bus 6"
 * (other names are ignored), so the seeded fleet (Bus 1–6) suggests "Bus 7" and an empty one "Bus 1".
 * Pass the whole fleet, active and inactive, not a filtered list.
 */
export function nextBusName(buses: readonly Pick<Bus, "name">[]): string {
  let highest = 0;
  for (const { name } of buses) {
    const match = NUMBERED_BUS_NAME.exec(name.trim());
    if (match?.[1]) highest = Math.max(highest, Number(match[1]));
  }
  return `Bus ${highest + 1}`;
}
