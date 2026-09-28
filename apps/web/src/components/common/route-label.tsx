import type { RouteEndpoints } from "@excelcabs/types";
import { cn } from "@excelcabs/ui/lib/utils";
import { ArrowLeftRight, ArrowRight } from "lucide-react";

interface RouteLabelProps {
  route: RouteEndpoints;
  /** "A ⇄ B" for a bus's route (it runs both ways); the default "A → B" is one trip's direction. */
  bidirectional?: boolean;
  /** Smaller text for dense rows and cards. */
  compact?: boolean;
  className?: string;
}

/**
 * "Shakthan Stand → SmartCity" with an arrow icon; screen readers hear "Shakthan Stand to SmartCity"
 * (or "and" when bidirectional).
 */
export function RouteLabel({ route, bidirectional = false, compact = false, className }: RouteLabelProps) {
  const Arrow = bidirectional ? ArrowLeftRight : ArrowRight;
  return (
    <span
      data-slot="route-label"
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", compact && "text-sm", className)}
    >
      <span className="truncate">{route.origin}</span>
      <Arrow
        aria-hidden="true"
        className={cn("shrink-0 text-muted-foreground", compact ? "size-3.5" : "size-4")}
      />
      <span className="sr-only">{bidirectional ? "and" : "to"}</span>
      <span className="truncate">{route.destination}</span>
    </span>
  );
}
