"use client";

import { Button } from "@excelcabs/ui/components/button";
import { House, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-card sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive"
        >
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An unexpected error stopped this page from loading. You can try again or head back home.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button asChild variant="soft" size="lg">
            <Link href="/">
              <House />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
