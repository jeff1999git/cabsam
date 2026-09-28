import type { Bus, ISODate, TimeHM, Trip, TripDirection, TripStatus } from "@excelcabs/types";

import { addDays, dayOfWeek, istToEpoch, istToInstant } from "@/lib/datetime";

import { BUS_IDS } from "./buses";
import { DRIVER_IDS } from "./drivers";

interface TripTemplate {
  id: string;
  departureTime: TimeHM;
  busId: string;
  direction: TripDirection;
  driverId: string;
}

/** The daily timetable (Mon–Sat): every bus goes out in the morning and returns in the evening. */
const TRIP_TEMPLATES: readonly TripTemplate[] = [
  { id: "t1", departureTime: "07:00", busId: BUS_IDS.bus2, direction: "outbound", driverId: DRIVER_IDS.biju },
  { id: "t2", departureTime: "07:30", busId: BUS_IDS.bus1, direction: "outbound", driverId: DRIVER_IDS.suresh },
  { id: "t3", departureTime: "08:00", busId: BUS_IDS.bus3, direction: "outbound", driverId: DRIVER_IDS.anil },
  { id: "t4", departureTime: "09:00", busId: BUS_IDS.bus4, direction: "outbound", driverId: DRIVER_IDS.pradeep },
  { id: "t5", departureTime: "17:30", busId: BUS_IDS.bus2, direction: "return", driverId: DRIVER_IDS.biju },
  { id: "t6", departureTime: "17:45", busId: BUS_IDS.bus1, direction: "return", driverId: DRIVER_IDS.suresh },
  { id: "t7", departureTime: "18:00", busId: BUS_IDS.bus3, direction: "return", driverId: DRIVER_IDS.anil },
  { id: "t8", departureTime: "18:30", busId: BUS_IDS.bus4, direction: "return", driverId: DRIVER_IDS.pradeep },
];

const WINDOW = { daysBack: 7, daysAhead: 14 } as const;

/** Seeded trips that were cancelled by the operator: (operating-day offset, template). */
const CANCELLED_TRIPS = [
  { opDay: -3, templateId: "t7", reason: "Vehicle breakdown" },
  { opDay: 5, templateId: "t6", reason: "Driver unavailable" },
] as const;

const MS_PER_MINUTE = 60_000;

export function tripId(date: ISODate, templateId: string): string {
  return `trp_${date.replaceAll("-", "")}_${templateId}`;
}

/** Days with service in the seed window: Mon–Sat except holidays. Today always operates. */
export function operatingDays(today: ISODate, holidayDates: ReadonlySet<ISODate>): ISODate[] {
  const days: ISODate[] = [];
  for (let offset = -WINDOW.daysBack; offset <= WINDOW.daysAhead; offset += 1) {
    const date = addDays(today, offset);
    if (date === today || (dayOfWeek(date) !== 0 && !holidayDates.has(date))) days.push(date);
  }
  return days;
}

/** The nth operating day relative to today (0 = today, −1 = the one before), if in the window. */
export function nthOperatingDay(
  days: readonly ISODate[],
  today: ISODate,
  n: number,
): ISODate | undefined {
  const todayIndex = days.indexOf(today);
  return todayIndex === -1 ? undefined : days[todayIndex + n];
}

interface GenerateTripsOptions {
  today: ISODate;
  days: readonly ISODate[];
  buses: readonly Bus[];
  seededAtMs: number;
}

/** Past days are completed; today and later are scheduled (whatever the time of day). */
export function generateTrips({ today, days, buses, seededAtMs }: GenerateTripsOptions): Trip[] {
  const durationByBus = new Map(buses.map((bus) => [bus.id, bus.durationMinutes]));
  const cancelled = new Map(
    CANCELLED_TRIPS.flatMap(({ opDay, templateId, reason }) => {
      const date = nthOperatingDay(days, today, opDay);
      return date ? [[tripId(date, templateId), reason] as const] : [];
    }),
  );

  return days.flatMap((date) =>
    TRIP_TEMPLATES.map((template): Trip => {
      const id = tripId(date, template.id);
      const durationMinutes = durationByBus.get(template.busId);
      if (durationMinutes === undefined) throw new Error(`Unknown bus ${template.busId}`);
      const departureMs = istToEpoch(date, template.departureTime);
      const createdAt = istToInstant(addDays(date, -21), "10:00");
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
        completedAt = new Date(departureMs + (durationMinutes + 5) * MS_PER_MINUTE).toISOString();
      }

      return {
        id,
        busId: template.busId,
        direction: template.direction,
        driverId: template.driverId,
        date,
        departureTime: template.departureTime,
        durationMinutes,
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
}
