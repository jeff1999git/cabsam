import type { Unsubscribe } from "@excelcabs/types";

import { mockDemoService } from "./mock/demo.mock";

/**
 * Why data changed underneath the current tab: another tab wrote to it, or it was regenerated
 * (`stale`: a new day; `corrupt` / `version`: unreadable or outdated storage; `reset`: on request).
 */
export type DataChangeEvent =
  | { type: "external-change" }
  | { type: "reseeded"; reason: "stale" | "corrupt" | "version" | "reset" };

/** Demo tooling. An API implementation would report `enabled: false` and make these no-ops. */
export interface DemoService {
  readonly enabled: boolean;
  /** Restores the seeded demo data; signs out a user who no longer exists afterwards. */
  reset(): Promise<void>;
  onExternalChange(listener: (event: DataChangeEvent) => void): Unsubscribe;
}

/** Swap point: replace with an API-backed implementation. */
export const demoService: DemoService = mockDemoService;
