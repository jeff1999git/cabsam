import "client-only";

import type { Session, Unsubscribe, User, UserRole } from "@excelcabs/types";

import type { MockDb } from "@/lib/mock/db";

import { forbidden, unauthorized } from "../errors";

/** Persisted in localStorage so a sign-in is shared by every tab, like a real login cookie. */
const SESSION_KEY = "excelcabs:session:v1";

/** `undefined` until first read; then the parsed session (a stable reference until it changes). */
let cached: Session | null | undefined;
let attached = false;
const listeners = new Set<() => void>();

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const { token, user, issuedAt } = value as Partial<Record<keyof Session, unknown>>;
  if (typeof token !== "string" || typeof issuedAt !== "string") return false;
  if (typeof user !== "object" || user === null) return false;
  const { id, role } = user as Partial<Record<keyof User, unknown>>;
  return typeof id === "string" && typeof role === "string";
}

function parseSession(raw: string | null): Session | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isSession(value) ? value : null;
  } catch {
    return null;
  }
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeStorage(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable: the session still lives in memory for this tab.
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  // `key === null` means another tab cleared all storage.
  if (event.key !== SESSION_KEY && event.key !== null) return;
  cached = parseSession(event.newValue);
  notify();
}

function attach(): void {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener("storage", onStorage);
}

export const sessionStore = {
  /** Synchronous and referentially stable, as `useSyncExternalStore` requires. */
  getSnapshot(): Session | null {
    if (typeof window === "undefined") return null;
    if (cached === undefined) {
      attach();
      cached = parseSession(readStorage());
    }
    return cached;
  },

  set(session: Session | null): void {
    cached = session;
    writeStorage(session);
    notify();
  },

  subscribe(listener: () => void): Unsubscribe {
    attach();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * The signed-in user, re-validated against the database on every call (like an API checking its
 * session table). A missing, deleted or disabled user is UNAUTHORIZED(SESSION_INVALID); a role
 * outside `roles` is FORBIDDEN. The session itself is left for the caller's error handling to clear.
 */
export function requireUser<TRole extends UserRole>(
  db: Readonly<MockDb>,
  roles: readonly TRole[],
): User & { role: TRole };
export function requireUser(db: Readonly<MockDb>): User;
export function requireUser(db: Readonly<MockDb>, roles?: readonly UserRole[]): User {
  const session = sessionStore.getSnapshot();
  const user = session ? db.users.find((candidate) => candidate.id === session.user.id) : undefined;
  if (!user || user.status !== "active") {
    throw unauthorized("SESSION_INVALID", "Your session has ended. Please sign in again.");
  }
  if (roles && !roles.includes(user.role)) throw forbidden();
  return user;
}
