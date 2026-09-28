import { toast } from "@excelcabs/ui/components/sonner";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { authService } from "@/services/auth.service";
import { errorMessage, hasFieldErrors, isServiceError, isSessionInvalid } from "@/services/errors";

import type { QueryDomain } from "./keys";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Query domains to refetch after success; the mutation stays pending until they have. */
      invalidates?: readonly QueryDomain[];
      /** Skip the global error toast (the screen reports the error itself). */
      silentError?: boolean;
    };
  }
}

const SESSION_ENDED_TOAST_ID = "session-ended";

/** Refresh interval for screens that track live operations (seat counts, trip status). */
export const LIVE_REFETCH_INTERVAL_MS = 60_000;

/**
 * A service rejected the session (user deleted, disabled or data reset): sign out like a real
 * app does on a 401. Role guards then send the person to the sign-in page.
 */
function handleSessionError(error: unknown): boolean {
  if (!isSessionInvalid(error)) return false;
  if (authService.getSessionSnapshot()) {
    void authService.signOut();
    toast.error("Your session has ended. Please sign in again.", { id: SESSION_ENDED_TOAST_ID });
  }
  return true;
}

export function makeQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleSessionError }),
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _onMutateResult, mutation) =>
        Promise.all(
          (mutation.meta?.invalidates ?? []).map((domain) =>
            queryClient.invalidateQueries({ queryKey: [domain] }),
          ),
        ),
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (handleSessionError(error)) return;
        // Field errors are shown on the form (see applyServiceError).
        if (mutation.meta?.silentError || hasFieldErrors(error)) return;
        toast.error(errorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Service errors are deliberate answers; only retry unexpected failures, once.
        retry: (failureCount, error) => !isServiceError(error) && failureCount < 1,
      },
      mutations: { retry: false },
    },
  });
  return queryClient;
}
