"use client";

import { toast, Toaster } from "@excelcabs/ui/components/sonner";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";

import { makeQueryClient } from "@/queries/client";
import { authService } from "@/services/auth.service";
import { type DataChangeEvent, demoService } from "@/services/demo.service";

const RESEED_MESSAGES: Record<Extract<DataChangeEvent, { type: "reseeded" }>["reason"], string> = {
  stale: "Demo data refreshed for today",
  corrupt: "Demo data was reset",
  version: "Demo data was reset",
  reset: "Demo data reset",
};

/**
 * Keeps cached queries in step with data changed outside React Query: another tab's writes, a
 * demo-data reseed, or a different signed-in user (cached data of the previous identity is dropped).
 */
function DataSyncBridge() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      demoService.onExternalChange((event) => {
        void queryClient.invalidateQueries();
        if (event.type === "reseeded") toast.success(RESEED_MESSAGES[event.reason]);
      }),
    [queryClient],
  );

  useEffect(() => {
    let userId = authService.getSessionSnapshot()?.user.id;
    return authService.subscribe(() => {
      const nextUserId = authService.getSessionSnapshot()?.user.id;
      if (nextUserId === userId) return;
      userId = nextUserId;
      queryClient.removeQueries();
    });
  }, [queryClient]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <DataSyncBridge />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
