import { skipToken, useMutation, useQuery } from "@tanstack/react-query";

import { useSession } from "@/hooks/use-session";
import { authService } from "@/services/auth.service";

import { queryKeys } from "./keys";

/**
 * The signed-in user, re-validated by the service. Use in protected layouts: an invalid session
 * (deleted / disabled user) fails with SESSION_INVALID and the global handler signs out.
 */
export function useCurrentUser() {
  const { status } = useSession();
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: status === "authenticated" ? authService.getCurrentUser : skipToken,
  });
}

/**
 * Errors are not toasted: render `error.message` next to the form (WRONG_PORTAL carries
 * `details.portal` for a link to the right sign-in page). Cached data of the previous identity is
 * dropped automatically when the session changes.
 */
export function useSignIn() {
  return useMutation({ mutationFn: authService.signIn, meta: { silentError: true } });
}

/** Customer sign-up; signs the new customer in. Map field errors with `applyServiceError`. */
export function useSignUp() {
  return useMutation({ mutationFn: authService.signUp });
}

export function useSignOut() {
  return useMutation({ mutationFn: authService.signOut });
}
