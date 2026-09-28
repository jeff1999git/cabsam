"use client";

import type { SessionUser } from "@excelcabs/types";
import { Avatar, AvatarFallback } from "@excelcabs/ui/components/avatar";
import { Button } from "@excelcabs/ui/components/button";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { StatusBadge } from "@excelcabs/ui/composites/status-badge";
import { getInitials } from "@excelcabs/ui/lib/initials";
import { cn } from "@excelcabs/ui/lib/utils";
import { LogOut, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ADMIN_NAV, isNavItemActive } from "@/config/navigation";
import { useResetDemoData } from "@/queries/demo";
import { demoService } from "@/services/demo.service";

interface AdminSidebarProps {
  user: SessionUser;
  onSignOut: () => void;
  signingOut?: boolean;
  /** Called when a nav link is clicked (the mobile sheet closes itself). */
  onNavigate?: () => void;
}

/** Sidebar content shared by the fixed desktop column and the mobile sheet. */
export function AdminSidebar({ user, onSignOut, signingOut = false, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const [confirmReset, setConfirmReset] = useState(false);
  const reset = useResetDemoData();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <Logo href="/admin" />
        <StatusBadge tone="info">Admin</StatusBadge>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {ADMIN_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="grid gap-2">
          {demoService.enabled ? (
            <Button variant="soft" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw />
              Reset demo data
            </Button>
          ) : null}
          <Button variant="outline" size="sm" loading={signingOut} onClick={onSignOut}>
            <LogOut />
            Logout
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="Bookings, trips, buses, drivers and accounts go back to the seeded demo state. This cannot be undone."
        confirmLabel="Reset data"
        tone="destructive"
        onConfirm={() => reset.mutateAsync()}
      />
    </div>
  );
}
