import {
  type ISODate,
  OPERATING_WEEKDAYS,
  type Trip,
  type TripSeries,
  type TripStatus,
} from "@excelcabs/types";

import { addDays, dayOfWeek, istToEpoch, istToInstant } from "@/lib/datetime";

import { BUS_IDS } from "./buses";
import { DRIVER_IDS } from "./drivers";

type SeriesTemplate = Pick<
  TripSeries,
  "departureTime" | "busId" | "driverId" | "origin" | "destination" | "durationMinutes"
> & {
  /** Short key in the seeded ids: series `srs_t1`, trips `trp_20260928_t1`. */
  id: string;
};

/**
 * The timetable, one Mon–Sat series per row: every bus goes out in the morning and comes back in
 * the evening on the same corridor.
 */
const SERIES_TEMPLATES: readonly SeriesTemplate[] = [
  { id: "t1", departureTime: "07:00", busId: BUS_IDS.bus2, driverId: DRIVER_IDS.biju, origin: "Shakthan Stand", destination: "SmartCity", durationMinutes: 120 },
  { id: "t2", departureTime: "07:30", busId: BUS_IDS.bus1, driverId: DRIVER_IDS.suresh, origin: "Thrissur Railway Station", destination: "Infopark", durationMinutes: 110 },
  { id: "t3", departureTime: "08:00", busId: BUS_IDS.bus3, driverId: DRIVER_IDS.anil, origin: "Chalakudy", destination: "SmartCity", durationMinutes: 90 },
  { id: "t4", departureTime: "09:00", busId: BUS_IDS.bus4, driverId: DRIVER_IDS.pradeep, origin: "Shakthan Stand", destination: "SmartCity", durationMinutes: 120 },
  { id: "t5", departureTime: "17:30", busId: BUS_IDS.bus2, driverId: DRIVER_IDS.biju, origin: "SmartCity", destination: "Shakthan Stand", durationMinutes: 120 },
  { id: "t6", departureTime: "17:45", busId: BUS_IDS.bus1, driverId: DRIVER_IDS.suresh, origin: "Infopark", destination: "Thrissur Railway Station", durationMinutes: 110 },
  { id: "t7", departureTime: "18:00", busId: BUS_IDS.bus3, driverId: DRIVER_IDS.anil, origin: "SmartCity", destination: "Chalakudy", durationMinutes: 90 },
  { id: "t8", departureTime: "18:30", busId: BUS_IDS.bus4, driverId: DRIVER_IDS.pradeep, origin: "SmartCity", destination: "Shakthan Stand", durationMinutes: 120 },
];

const WINDOW = { daysBack: 7, daysAhead: 14 } as const;
/** The series were set up this long before their first date. */
const SERIES_CREATED_DAYS_BEFORE_START = 21;

/** Seeded trips that were cancelled by the operator: (operating-day offset from the anchor, template). */
const CANCELLED_TRIPS = [
  { opDay: -3, templateId: "t7", reason: "Vehicle breakdown" },
  { opDay: 5, templateId: "t6", reason: "Driver unavailable" },
] as const;

const MS_PER_MINUTE = 60_000;

export function seriesId(templateId: string): string {
  return `srs_${templateId}`;
}

export function tripId(date: ISODate, templateId: string): string {
  return `trp_${date.replaceAll("-", "")}_${templateId}`;
}

/** Days with service in the seed window [today − 7, today + 14]: Mon–Sat except holidays. */
export function operatingDays(today: ISODate, holidayDates: ReadonlySet<ISODate>): ISODate[] {
  const days: ISODate[] = [];
  for (let offset = -WINDOW.daysBack; offset <= WINDOW.daysAhead; offset += 1) {
    const date = addDays(today, offset);
    if (dayOfWeek(date) !== 0 && !holidayDates.has(date)) days.push(date);
  }
  return days;
}

/**
 * The first operating day on or after today (today itself on Mon–Sat non-holidays). The headline
 * seed facts are placed on it and on the operating days around it.
 */
export function anchorDay(days: readonly ISODate[], today: ISODate): ISODate {
  const anchor = days.find((date) => date >= today);
  if (anchor === undefined) throw new Error(`No operating day on or after ${today} in the seed window`);
  return anchor;
}

/** The nth operating day from the anchor (0 = the anchor, −1 = the one before), if in the window. */
export function nthOperatingDay(
  days: readonly ISODate[],
  anchor: ISODate,
  n: number,
): ISODate | undefined {
  const anchorIndex = days.indexOf(anchor);
  return anchorIndex === -1 ? undefined : days[anchorIndex + n];
}

interface GenerateScheduleOptions {
  today: ISODate;
  anchor: ISODate;
  /** Operating days of the seed window, in order. */
  days: readonly ISODate[];
  seededAtMs: number;
}

/**
 * One Mon–Sat series per template running from the first operating day of the window to
 * today + 14, and its trips on every operating day. Past days are completed; today and later are
 * scheduled (whatever the time of day).
 */
export function generateSchedule({ today, anchor, days, seededAtMs }: GenerateScheduleOptions): {
  series: TripSeries[];
  trips: Trip[];
} {
  const [startDate] = days;
  if (startDate === undefined) throw new Error("The seed window has no operating day");
  const endDate = addDays(today, WINDOW.daysAhead);
  const createdAt = istToInstant(addDays(startDate, -SERIES_CREATED_DAYS_BEFORE_START), "10:00");
  const series = SERIES_TEMPLATES.map(
    ({ id, ...template }): TripSeries => ({
      id: seriesId(id),
      ...template,
      weekdays: [...OPERATING_WEEKDAYS],
      startDate,
      endDate,
      createdAt,
    }),
  );
  const cancelled = new Map(
    CANCELLED_TRIPS.flatMap(({ opDay, templateId, reason }) => {
      const date = nthOperatingDay(days, anchor, opDay);
      return date ? [[tripId(date, templateId), reason] as const] : [];
    }),
  );

  const trips = days.flatMap((date) =>
    SERIES_TEMPLATES.map(({ id: templateId, ...template }): Trip => {
      const id = tripId(date, templateId);
      const departureMs = istToEpoch(date, template.departureTime);
      const cancellationReason = cancelled.get(id) ?? null;
      const isPast = date < today;

      let status: TripStatus = isPast ? "completed" : "scheduled";
      let startedAt: string | null = null;
      let completedAt: string | null = null;
      let cancelledAt: string | null = null;
      if (cancellationReason) {
        status = "cancelled";
        // Past: called off on the day; future: called off shortly before the data was generated.
        const cancelledMs = isPast ? departureMs - 180 * MS_PER_MINUTE : seededAtMs - 60 * MS_PER_MINUTE;
        cancelledAt = new Date(cancelledMs).toISOString();
      } else if (isPast) {
        startedAt = new Date(departureMs + 2 * MS_PER_MINUTE).toISOString();
        completedAt = new Date(departureMs + (template.durationMinutes + 5) * MS_PER_MINUTE).toISOString();
      }

      return {
        id,
        ...template,
        seriesId: seriesId(templateId),
        date,
        status,
        startedAt,
        completedAt,
        cancelledAt,
        cancellationReason,
        createdAt,
        updatedAt: completedAt ?? cancelledAt ?? createdAt,
      };
    }),
  );
  return { series, trips };
}
