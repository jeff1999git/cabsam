import "client-only";

import type { FieldErrors } from "@excelcabs/types";
import { z } from "zod";

import { env } from "@/lib/env";
import type { MockDb } from "@/lib/mock/db";
import { mockStore } from "@/lib/mock/store";

import { ServiceError, validation } from "../errors";

const WRITE_LATENCY_FACTOR = 1.5;

/** Simulated network delay: base × 0.6–1.4 for reads, 1.5× that for writes. */
export function latency(kind: "read" | "write"): Promise<void> {
  const base = env.mockLatencyMs * (kind === "write" ? WRITE_LATENCY_FACTOR : 1);
  if (base <= 0) return Promise.resolve();
  const delay = Math.round(base * (0.6 + Math.random() * 0.8));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Waits, reads, and returns a deep copy — callers never hold references into the store. */
export async function mockRead<T>(fn: (db: Readonly<MockDb>) => T): Promise<T> {
  await latency("read");
  return structuredClone(mockStore.read(fn));
}

/** Waits, then runs `fn` as one atomic write; returns a deep copy of its result. */
export async function mockWrite<T>(fn: (draft: MockDb) => T): Promise<T> {
  await latency("write");
  return structuredClone(mockStore.write(fn));
}

/** Validates service input like an API would, turning schema issues into VALIDATION errors. */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const { formErrors, fieldErrors } = z.flattenError(result.error);
  const firstMessages: FieldErrors = {};
  for (const [field, messages] of Object.entries<string[] | undefined>(fieldErrors)) {
    if (messages?.[0]) firstMessages[field] = messages[0];
  }
  const message = formErrors[0] ?? "Please fix the highlighted fields";
  if (Object.keys(firstMessages).length === 0) throw new ServiceError({ code: "VALIDATION", message });
  throw validation(firstMessages, message);
}

function randomHex(bytes: number): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

/** Id for an entity created at runtime, e.g. `bus_3f9a1c2e`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomHex(4)}`;
}

export function newToken(): string {
  return randomHex(24);
}
