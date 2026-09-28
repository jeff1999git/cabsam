import type { RouteEndpoints } from "@excelcabs/types";

/** '9947963408' → '99479 63408'. Anything that is not 10 digits is returned unchanged. */
export function formatMobile(mobile: string): string {
  return /^\d{10}$/.test(mobile) ? `${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile;
}

/** '9947963408' → 'tel:+919947963408' */
export function telHref(mobile: string): `tel:${string}` {
  return `tel:+91${mobile.replace(/\D/g, "")}`;
}

/** pluralize(1, 'trip') → '1 trip'; pluralize(3, 'bus', 'buses') → '3 buses' */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** '22 seats available' · '1 seat available' · 'No seats available' */
export function formatSeats(available: number): string {
  return available > 0 ? `${pluralize(available, "seat")} available` : "No seats available";
}

/** '18 / 40' */
export function formatOccupancy(booked: number, capacity: number): string {
  return `${booked} / ${capacity}`;
}

/** 'Shakthan Stand → SmartCity' */
export function formatRoute(route: RouteEndpoints): string {
  return `${route.origin} → ${route.destination}`;
}
