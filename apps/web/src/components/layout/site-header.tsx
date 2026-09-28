"use client";

import type { SessionUser } from "@excelcabs/types";
import { Avatar, AvatarFallback } from "@excelcabs/ui/components/avatar";
import { Button } from "@excelcabs/ui/components/button";
import { Separator } from "@excelcabs/ui/components/separator";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@excelcabs/ui/components/sheet";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { getInitials } from "@excelcabs/ui/lib/initials";
import { cn } from "@excelcabs/ui/lib/utils";
import { LayoutDashboard, LogIn, LogOut, Menu, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useSignOutAction } from "@/components/auth/use-sign-out-action";
import { Logo } from "@/components/brand/logo";
import { CUSTOMER_NAV, isNavItemActive, ROLE_LABEL, STAFF_LOGIN_LINKS } from "@/config/navigation";
import { type SessionState, useSession } from "@/hooks/use-session";
import { ROLE_HOME } from "@/lib/safe-redirect";

import { AccountMenu } from "./account-menu";

const mobileRowClassName =
  "flex h-12 w-full items-center gap-3 rounded-lg px-3 text-base font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-primary";

function DesktopItems({
  state,
  pathname,
  onSignOut,
  signingOut,
}: {
  state: SessionState;
  pathname: string;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  if (state.status === "loading") {
    return <Skeleton className="h-10 w-48 rounded-lg" />;
  }
  if (state.status === "unauthenticated") {
    return (
      <>
        <Button asChild variant="soft">
          <Link href="/login">
            <LogIn />
            Sign In
          </Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
        <Separator orientation="vertical" className="mx-2 h-6" />
        {STAFF_LOGIN_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <item.icon aria-hidden="true" className="size-4" />
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  const { user } = state.session;
  if (user.role === "customer") {
    return (
      <>
        <nav aria-label="Customer" className="flex items-center gap-1">
          {CUSTOMER_NAV.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <AccountMenu
          user={user}
          items={CUSTOMER_NAV.slice(1)}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
      </>
    );
  }
  return (
    <>
      <Button asChild variant="soft">
        <Link href={ROLE_HOME[user.role]}>
          <LayoutDashboard />
          Go to dashboard
        </Link>
      </Button>
      <AccountMenu user={user} onSignOut={onSignOut} signingOut={signingOut} />
    </>
  );
}

function MobileUserCard({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
      <Avatar className="size-10">
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ROLE_LABEL[user.role]} · {user.email}
        </p>
      </div>
    </div>
  );
}

function MobileItems({
  state,
  pathname,
  onSignOut,
  signingOut,
}: {
  state: SessionState;
  pathname: string;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  if (state.status === "loading") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }
  if (state.status === "unauthenticated") {
    return (
      <div className="space-y-1">
        <SheetClose asChild>
          <Link href="/login" className={mobileRowClassName}>
            <LogIn />
            Sign In
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link href="/signup" className={mobileRowClassName}>
            <UserPlus />
            Sign Up
          </Link>
        </SheetClose>
        <Separator className="my-2" />
        <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Staff
        </p>
        {STAFF_LOGIN_LINKS.map((item) => (
          <SheetClose key={item.href} asChild>
            <Link href={item.href} className={mobileRowClassName}>
              <item.icon />
              {item.label}
            </Link>
          </SheetClose>
        ))}
      </div>
    );
  }

  const { user } = state.session;
  const links = user.role === "customer" ? CUSTOMER_NAV : [];
  return (
    <div className="space-y-2">
      <MobileUserCard user={user} />
      <div className="space-y-1">
        {links.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(mobileRowClassName, active && "bg-primary-soft text-primary")}
              >
                <item.icon />
                {item.label}
              </Link>
            </SheetClose>
          );
        })}
        {user.role !== "customer" ? (
          <SheetClose asChild>
            <Link href={ROLE_HOME[user.role]} className={mobileRowClassName}>
              <LayoutDashboard />
              Go to dashboard
            </Link>
          </SheetClose>
        ) : null}
        <button
          type="button"
          disabled={signingOut}
          onClick={onSignOut}
          className={cn(mobileRowClassName, "disabled:opacity-50")}
        >
          <LogOut />
          Sign out
        </button>
      </div>
    </div>
  );
}

/** Floating white card header of the customer site. */
export function SiteHeader() {
  const state = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, pending } = useSignOutAction();

  function handleSignOut() {
    setMenuOpen(false);
    signOut();
  }

  return (
    <header className="mt-4">
      <div className="flex h-16 items-center justify-between gap-4 rounded-xl border bg-card px-4 shadow-card sm:px-5">
        <Logo href="/" />

        <div className="hidden items-center gap-2 md:flex">
          <DesktopItems state={state} pathname={pathname} onSignOut={handleSignOut} signingOut={pending} />
        </div>

        <div className="md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs sm:max-w-xs">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <MobileItems
                  state={state}
                  pathname={pathname}
                  onSignOut={handleSignOut}
                  signingOut={pending}
                />
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
