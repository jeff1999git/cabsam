"use client";

import { StatusBadge } from "@excelcabs/ui/composites/status-badge";
import type { ReactNode } from "react";

import { useSignOutAction } from "@/components/auth/use-sign-out-action";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/hooks/use-session";

import { AccountMenu } from "./account-menu";

/** Mobile-first driver frame: sticky top bar with a compact logo, role pill and account menu. */
export function DriverShell({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { signOut, pending } = useSignOutAction();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Logo href="/driver" />
            <StatusBadge tone="info">Driver</StatusBadge>
          </div>
          {session ? (
            <AccountMenu user={session.user} onSignOut={signOut} signingOut={pending} />
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
