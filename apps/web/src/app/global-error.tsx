"use client";

import { Button } from "@excelcabs/ui/components/button";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { useEffect } from "react";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Replaces the root layout when it fails, so it renders its own document. */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-IN" className={GeistSans.variable}>
      <body className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
        <main className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Excel Cabs is unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong while loading the app. Please try again.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="soft" size="lg">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
