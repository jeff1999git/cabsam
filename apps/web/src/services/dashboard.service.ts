import type { AdminDashboardSummary } from "@excelcabs/types";

import { mockDashboardService } from "./mock/dashboard.mock";

export interface DashboardService {
  /** Admin. Today's operations at a glance. */
  getAdminSummary(): Promise<AdminDashboardSummary>;
}

/** Swap point: replace with an API-backed implementation. */
export const dashboardService: DashboardService = mockDashboardService;
