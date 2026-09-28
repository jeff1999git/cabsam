import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center sm:py-12",
  {
    variants: {
      variant: {
        /** Dashed-border panel — for page sections and lists. */
        outline: "rounded-xl border border-dashed bg-card/60",
        /** No frame — when already inside a card. */
        plain: "",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof emptyStateVariants> & {
    /** A lucide icon element, e.g. `<CalendarX />`. */
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
  };

function EmptyState({
  icon,
  title,
  description,
  action,
  variant,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ variant }), className)}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6"
        >
          {icon}
        </div>
      ) : null}
      <div className="max-w-sm space-y-1">
        <p className="font-semibold tracking-tight">{title}</p>
        {description ? (
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
