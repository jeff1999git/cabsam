import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const alertVariants = cva(
  [
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm",
    "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  ],
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-info/20 bg-info-soft text-info *:data-[slot=alert-description]:text-foreground/80",
        success:
          "border-success/20 bg-success-soft text-success *:data-[slot=alert-description]:text-foreground/80",
        warning:
          "border-warning/25 bg-warning-soft text-warning *:data-[slot=alert-description]:text-foreground/80",
        destructive:
          "border-destructive/20 bg-destructive-soft text-destructive *:data-[slot=alert-description]:text-foreground/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/**
 * Inline message banner; put an optional lucide icon first. Warnings and errors use `role="alert"`
 * (announced immediately), other variants `role="status"`; pass `role` to override.
 */
function Alert({ className, variant, ...props }: AlertProps) {
  const role = variant === "destructive" || variant === "warning" ? "alert" : "status";

  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle, alertVariants, type AlertProps };
