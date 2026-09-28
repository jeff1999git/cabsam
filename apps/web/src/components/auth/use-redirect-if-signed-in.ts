"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/hooks/use-session";
import { safeRedirect } from "@/lib/safe-redirect";

/**
 * Sends an already signed-in visitor of a sign-in / sign-up page to `?redirect=` (validated for
 * their role) or their home page. Returns true while that navigation is underway.
 */
export function useRedirectIfSignedIn(redirectParam: string | null): boolean {
  const router = useRouter();
  const { status, session } = useSession();
  const target = status === "authenticated" ? safeRedirect(redirectParam, session.user.role) : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return target !== null;
}
