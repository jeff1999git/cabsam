import { useMutation } from "@tanstack/react-query";

import { demoService } from "@/services/demo.service";

/**
 * Restores the seeded demo data. The app-wide data sync refetches every query and shows the
 * confirmation toast, so callers only need the pending state.
 */
export function useResetDemoData() {
  return useMutation({ mutationFn: demoService.reset });
}
