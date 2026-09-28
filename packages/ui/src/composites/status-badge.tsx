import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../lib/utils";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
  {
    variants: {
      tone: {
        neutral: "bg-card text-foreground ring-border",
        info: "bg-info-soft text-info ring-transparent",
        success: "bg-success-soft text-success ring-transparent",
        warning: "bg-warning-soft text-warning ring-warning/20",
        danger: "bg-destructive-soft text-destructive ring-destructive/15",
        muted: "bg-muted text-muted-foreground ring-transparent",
      } satisfies Record<StatusTone, string>,
    },
  },
);

type StatusBadgeProps = React.ComponentProps<"span"> & {
  tone: StatusTone;
  /** Leading coloured dot, for extra emphasis on live states (e.g. "In progress"). */
  dot?: boolean;
};

/** Soft, tone-based status pill. Map domain statuses to a tone + label in the app. */
function StatusBadge({ tone, dot = false, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export { StatusBadge, type StatusBadgeProps, type StatusTone };
