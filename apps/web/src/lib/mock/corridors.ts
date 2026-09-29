import type { RouteEndpoints } from "@excelcabs/types";

/**
 * SEED ONLY: real places along each seeded corridor, keyed "first stop|last stop", from which the
 * generator draws booking pickup / drop points. The app has no stop list — customers type both
 * freely, and trips may run anywhere.
 */
const CORRIDOR_STOPS: Readonly<Record<string, readonly string[]>> = {
  "Shakthan Stand|SmartCity": ["Shakthan Stand", "Ollur", "Puthukkad", "Chalakudy", "Koratty", "Angamaly", "Aluva", "Kalamassery", "Edappally", "Kakkanad", "SmartCity"],
  "Thrissur Railway Station|Infopark": ["Thrissur Railway Station", "Ollur", "Chalakudy", "Angamaly", "Aluva", "Kalamassery", "Pathadipalam", "Infopark"],
  "Chalakudy|SmartCity": ["Chalakudy", "Koratty", "Angamaly", "Athani", "Aluva", "Kalamassery", "Kakkanad", "SmartCity"],
};

/** SEED ONLY: the places a seeded trip on `route` passes, in travel order (either way along a corridor). */
export function corridorStops(route: RouteEndpoints): string[] {
  const forward = CORRIDOR_STOPS[`${route.origin}|${route.destination}`];
  if (forward) return [...forward];
  const backward = CORRIDOR_STOPS[`${route.destination}|${route.origin}`];
  if (backward) return backward.toReversed();
  throw new Error(`No corridor stops for ${route.origin} → ${route.destination}`);
}
