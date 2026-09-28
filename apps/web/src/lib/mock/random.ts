/** Deterministic pseudo-random numbers for seed data (same inputs → same data, every day). */

const SALT = "excelcabs-seed-v1";

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** New shuffled array; the input is not modified. */
  shuffle<T>(items: readonly T[]): T[];
}

/** FNV-1a 32-bit hash. */
function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  function pick<T>(items: readonly T[]): T {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new RangeError("Cannot pick from an empty list");
    return item;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = int(0, index);
      const current = result[index] as T;
      result[index] = result[other] as T;
      result[other] = current;
    }
    return result;
  }

  return {
    next,
    int,
    float: (min, max) => min + next() * (max - min),
    chance: (probability) => next() < probability,
    pick,
    shuffle,
  };
}

/** Independent stream per purpose, e.g. `rngFor("bookings", "t1", -3)`. */
export function rngFor(...parts: (string | number)[]): Rng {
  return createRng(hash32([SALT, ...parts].join("|")));
}
