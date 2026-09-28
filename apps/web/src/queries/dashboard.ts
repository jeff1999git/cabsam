import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "@/services/dashboard.service";

import { LIVE_REFETCH_INTERVAL_MS } from "./client";
import { queryKeys } from "./keys";

/** Admin dashboard summary, refreshed every minute. */
export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.admin(),
    queryFn: dashboardService.getAdminSummary,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}
