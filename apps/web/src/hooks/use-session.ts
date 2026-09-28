import type { Session } from "@excelcabs/types";
import { useSyncExternalStore } from "react";

import { authService } from "@/services/auth.service";

export type SessionState =
  | { status: "loading"; session: null }
  | { status: "unauthenticated"; session: null }
  | { status: "authenticated"; session: Session };

/** The session lives in browser storage, so the server render (and hydration) sees "loading". */
function getServerSnapshot(): undefined {
  return undefined;
}

/** Current sign-in state, updated on sign-in / sign-out in this or any other tab. */
export function useSession(): SessionState {
  const session = useSyncExternalStore<Session | null | undefined>(
    authService.subscribe,
    authService.getSessionSnapshot,
    getServerSnapshot,
  );
  if (session === undefined) return { status: "loading", session: null };
  return session ? { status: "authenticated", session } : { status: "unauthenticated", session: null };
}
