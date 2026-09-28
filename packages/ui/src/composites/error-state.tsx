import * as React from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

import { Button } from "../components/button";
import { cn } from "../lib/utils";

type ErrorStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Shows a retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Puts the retry button in its loading state (e.g. while refetching). */
  retrying?: boolean;
};

/** Failed-to-load panel for a page or section, with an optional retry. */
function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this right now. Please try again.",
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-10 text-center shadow-card sm:py-12",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive"
      >
        <CircleAlert className="size-6" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-semibold tracking-tight">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" className="mt-1" loading={retrying} onClick={onRetry}>
          <RotateCcw />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState, type ErrorStateProps };
