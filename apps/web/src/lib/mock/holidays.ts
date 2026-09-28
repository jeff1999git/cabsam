import type { Holiday, ISODate } from "@excelcabs/types";

import { addDays, istToInstant } from "@/lib/datetime";

/** Fixed-date public holidays (lunar / Malayalam-calendar festivals are deliberately left out). */
const FIXED_HOLIDAYS: readonly { monthDay: string; reason: string }[] = [
  { monthDay: "01-26", reason: "Republic Day" },
  { monthDay: "05-01", reason: "May Day" },
  { monthDay: "08-15", reason: "Independence Day" },
  { monthDay: "10-02", reason: "Gandhi Jayanti" },
  { monthDay: "11-01", reason: "Kerala Piravi" },
  { monthDay: "12-25", reason: "Christmas" },
];

const LOOKBACK_DAYS = 7;

export function holidayId(date: ISODate): string {
  return `hol_${date.replaceAll("-", "")}`;
}

/**
 * The occurrence of each fixed holiday within [today − 7, today + 365], sorted by date. Today is
 * never a holiday, so the demo always has a working day to show.
 */
export function generateHolidays(today: ISODate): Holiday[] {
  const earliest = addDays(today, -LOOKBACK_DAYS);
  const year = Number(today.slice(0, 4));
  const createdAt = istToInstant(addDays(today, -60), "12:00");

  return FIXED_HOLIDAYS.flatMap(({ monthDay, reason }) => {
    const thisYear = `${year}-${monthDay}`;
    const date = thisYear >= earliest ? thisYear : `${year + 1}-${monthDay}`;
    return date === today ? [] : [{ id: holidayId(date), date, reason, createdAt }];
  }).toSorted((a, b) => a.date.localeCompare(b.date));
}
