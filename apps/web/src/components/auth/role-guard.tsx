"use client";

import type { UserRole } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { CenteredSpinner } from "@/components/common/centered-spinner";
import { ROLE_LABEL } from "@/config/navigation";
import { useSession } from "@/hooks/use-session";
import { loginHref, ROLE_HOME } from "@/lib/safe-redirect";
import { useCurrentUser } from "@/queries/auth";

import { useSignOutAction } from "./use-sign-out-action";

/** Re-validates the session; an invalid one is signed out globally, which sends us to the login. */
function SessionValidator() {
  useCurrentUser();
  return null;
}

function WrongRolePanel({ signedInAs, expected }: { signedInAs: UserRole; expected: UserRole }) {
  const { signOut, pending } = useSignOutAction();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
      <div className="w-full rounded-xl border bg-card p-6 text-center shadow-card sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning"
        >
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          You&apos;re signed in as {ROLE_LABEL[signedInAs]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is for {ROLE_LABEL[expected].toLowerCase()} accounts. Go to your own dashboard, or
          sign out to switch accounts.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={ROLE_HOME[signedInAs]}>Go to my dashboard</Link>
          </Button>
          <Button variant="soft" loading={pending} onClick={signOut}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RoleGuardProps {
  role: UserRole;
  children: ReactNode;
}

/**
 * Protects a subtree: signed-out visitors go to the role's sign-in page (and return here after),
 * other roles see a switch-account panel, and the right role is re-validated while it browses.
 */
export function RoleGuard({ role, children }: RoleGuardProps) {
  const { status, session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(loginHref(role, `${pathname}${window.location.search}`));
  }, [status, pathname, role, router]);

  if (status !== "authenticated") return <CenteredSpinner label="Checking your sign-in" />;
  if (session.user.role !== role) {
    return <WrongRolePanel signedInAs={session.user.role} expected={role} />;
  }
  return (
    <>
      <SessionValidator />
      {children}
    </>
  );
}
