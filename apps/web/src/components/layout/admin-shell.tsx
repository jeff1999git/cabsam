"use client";

import { Button } from "@excelcabs/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@excelcabs/ui/components/sheet";
import { Menu } from "lucide-react";
import { type ReactNode, useState } from "react";

import { useSignOutAction } from "@/components/auth/use-sign-out-action";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/hooks/use-session";

import { AdminSidebar } from "./admin-sidebar";

/** Admin frame: fixed sidebar from `lg`, sticky top bar with a menu sheet below it. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, pending } = useSignOutAction();

  function handleSignOut() {
    setMenuOpen(false);
    signOut();
  }

  const sidebar = session ? (
    <AdminSidebar
      user={session.user}
      onSignOut={handleSignOut}
      signingOut={pending}
      onNavigate={() => setMenuOpen(false)}
    />
  ) : null;

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 sm:max-w-72">
              <SheetTitle className="sr-only">Admin menu</SheetTitle>
              <SheetDescription className="sr-only">Admin navigation</SheetDescription>
              {sidebar}
            </SheetContent>
          </Sheet>
          <Logo href="/admin" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
