import { Button } from "@excelcabs/ui/components/button";
import { SearchX } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:py-10">
      <header className="flex justify-center">
        <Logo size="md" href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-card sm:p-8">
          <div
            aria-hidden="true"
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <SearchX className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            That link doesn&apos;t go anywhere. The page may have moved, or the address has a typo.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/">Book a trip</Link>
            </Button>
            <Button asChild variant="soft" size="lg">
              <Link href="/customer">My bookings</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
