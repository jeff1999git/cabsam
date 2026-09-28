"use client";

import { Button } from "@excelcabs/ui/components/button";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { DEMO_PASSWORD, type DemoAccount } from "@/config/demo";
import { env } from "@/lib/env";
import { useResetDemoData } from "@/queries/demo";

interface DemoCredentialsProps {
  account: DemoAccount;
  /** Fills the sign-in form with the demo account. */
  onUse: (credentials: { email: string; password: string }) => void;
}

/** Subtle demo helper under the sign-in form; hidden when `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` is off. */
export function DemoCredentials({ account, onUse }: DemoCredentialsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reset = useResetDemoData();

  if (!env.showDemoCredentials) return null;

  return (
    <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
      <p className="leading-relaxed">
        <span className="font-medium text-foreground">Demo account</span> ·{" "}
        <span className="font-mono text-xs">{account.email}</span> ·{" "}
        <span className="font-mono text-xs">{DEMO_PASSWORD}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="soft"
          size="sm"
          onClick={() => onUse({ email: account.email, password: DEMO_PASSWORD })}
        >
          Use demo account
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
          <RotateCcw />
          Reset demo data
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset demo data?"
        description="Bookings, trips, buses, drivers and accounts go back to the seeded demo state. Anyone signed in with an account that no longer exists is signed out."
        confirmLabel="Reset data"
        tone="destructive"
        onConfirm={() => reset.mutateAsync()}
      />
    </div>
  );
}
