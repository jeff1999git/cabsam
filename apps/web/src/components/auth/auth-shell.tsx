import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

/** Centered card layout for the sign-in and sign-up pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:py-10">
      <header className="flex justify-center">
        <Logo size="md" href="/" />
      </header>
      <main className="flex flex-1 items-start justify-center py-8">
        <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-card sm:p-8">
          {children}
        </div>
      </main>
      <footer className="text-center text-xs text-muted-foreground">
        © Excel Cabs · Private Shuttle Bus Service
      </footer>
    </div>
  );
}
