import "client-only";

import type { Unsubscribe } from "@excelcabs/types";

import { today } from "@/lib/datetime";

import { type MockDb, SCHEMA_VERSION } from "./db";
import { assertDbInvariants } from "./invariants";
import { createSeedDb } from "./seed";

const DB_KEY_PREFIX = "excelcabs:db:";
const DB_KEY = `${DB_KEY_PREFIX}v${SCHEMA_VERSION}`;
const COLLECTIONS = ["users", "credentials", "routes", "buses", "trips", "bookings", "holidays"] as const;

type ReseedReason = "stale" | "corrupt" | "version" | "reset";

/** Changes the current tab did not make through `write`. */
type StoreEvent = { type: "external-change" } | { type: "reseeded"; reason: ReseedReason };

type Listener = (event: StoreEvent) => void;

let db: MockDb | undefined;
let attached = false;
let hadOutdatedData = false;
let persistenceWarned = false;
const listeners = new Set<Listener>();

function emit(event: StoreEvent): void {
  for (const listener of listeners) listener(event);
}

function persist(value: MockDb): void {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(value));
  } catch (error) {
    // Quota exceeded or storage blocked (private mode): keep working in memory for this tab.
    if (!persistenceWarned) console.warn("[mockStore] Could not persist demo data", error);
    persistenceWarned = true;
  }
}

/** Removes data stored under other schema versions; returns whether there was any. */
function removeOutdatedKeys(): boolean {
  try {
    const storage = window.localStorage;
    const outdated = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => key !== null && key.startsWith(DB_KEY_PREFIX) && key !== DB_KEY,
    );
    for (const key of outdated) storage.removeItem(key);
    return outdated.length > 0;
  } catch {
    return false;
  }
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(DB_KEY);
  } catch {
    return null;
  }
}

function isMockDb(value: unknown): value is MockDb {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Record<keyof MockDb, unknown>>;
  return (
    candidate.schemaVersion === SCHEMA_VERSION &&
    typeof candidate.seededOn === "string" &&
    COLLECTIONS.every((key) => Array.isArray(candidate[key]))
  );
}

function parseDb(raw: string): MockDb | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isMockDb(value) ? value : null;
  } catch {
    return null;
  }
}

function replaceWithSeed(reason: ReseedReason | null): MockDb {
  const fresh = createSeedDb(today(), Date.now());
  if (process.env.NODE_ENV !== "production") assertDbInvariants(fresh);
  db = fresh;
  persist(fresh);
  if (reason) emit({ type: "reseeded", reason });
  return fresh;
}

function onStorage(event: StorageEvent): void {
  if (event.key !== DB_KEY || event.newValue === null) return;
  const next = parseDb(event.newValue);
  if (!next) return;
  db = next;
  emit({ type: "external-change" });
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible" && db && db.seededOn !== today()) {
    replaceWithSeed("stale");
  }
}

function attach(): void {
  if (attached) return;
  if (typeof window === "undefined") throw new Error("[mockStore] browser-only");
  attached = true;
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibilityChange);
  hadOutdatedData = removeOutdatedKeys();
}

function ensureLoaded(): MockDb {
  if (db) return db;
  attach();
  const raw = readStorage();
  if (raw === null) return replaceWithSeed(hadOutdatedData ? "version" : null);
  const stored = parseDb(raw);
  if (!stored) return replaceWithSeed("corrupt");
  if (stored.seededOn !== today()) return replaceWithSeed("stale");
  db = stored;
  return db;
}

/**
 * The persisted mock database. Loaded lazily in the browser (never at import time or during SSR),
 * reseeded when missing, corrupt, from another schema version or generated for a previous day,
 * and kept in sync across tabs through the `storage` event.
 */
export const mockStore = {
  read<T>(fn: (db: Readonly<MockDb>) => T): T {
    return fn(ensureLoaded());
  },

  /** Runs `fn` on a copy and commits it only if `fn` returns — a thrown error changes nothing. */
  write<T>(fn: (draft: MockDb) => T): T {
    const draft = structuredClone(ensureLoaded());
    const result = fn(draft);
    db = draft;
    persist(draft);
    return result;
  },

  reset(): void {
    attach();
    replaceWithSeed("reset");
  },

  subscribe(listener: Listener): Unsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
