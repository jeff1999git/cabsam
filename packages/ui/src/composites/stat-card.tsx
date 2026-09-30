import * as React from "react";
import { cva } from "class-variance-authority";

import { Card } from "../components/card";
import { cn } from "../lib/utils";

type StatCardTone = "neutral" | "primary" | "success" | "warning" | "danger";

const iconChipVariants = cva(
  "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-destructive-soft text-destructive",
      } satisfies Record<StatCardTone, string>,
    },
  },
);

type StatCardProps = Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode;
  value: React.ReactNode;
  /** A lucide icon element, shown in a tinted chip. */
  icon?: React.ReactNode;
  /** Secondary line under the value, e.g. "3 in progress". */
  hint?: React.ReactNode;
  /** Colours the icon chip. */
  tone?: StatCardTone;
};

/** Headline number for dashboards. */
function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
  className,
  ...props
}: StatCardProps) {
  return (
    <Card
      data-slot="stat-card"
      className={cn("gap-3 px-4 py-4 sm:gap-3 sm:px-5 sm:py-5", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <div aria-hidden="true" className={iconChipVariants({ tone })}>
            {icon}
          </div>
        ) : null}
      </div>
      <div className="space-y-1">
        {/* `value` and `hint` may be elements (e.g. a Skeleton while loading), so they sit in divs. */}
        <div className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
    </Card>
  );
}

export { StatCard, type StatCardProps, type StatCardTone };
