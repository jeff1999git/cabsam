import type { RouteEndpoints } from "@excelcabs/types";
import { cn } from "@excelcabs/ui/lib/utils";
import { ArrowRight } from "lucide-react";

interface RouteLabelProps {
  route: RouteEndpoints;
  /** Smaller text for dense rows and cards. */
  compact?: boolean;
  className?: string;
}

/** "Shakthan Stand → SmartCity" with an arrow icon; screen readers hear "Shakthan Stand to SmartCity". */
export function RouteLabel({ route, compact = false, className }: RouteLabelProps) {
  return (
    <span
      data-slot="route-label"
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", compact && "text-sm", className)}
    >
      <span className="truncate">{route.origin}</span>
      <ArrowRight
        aria-hidden="true"
        className={cn("shrink-0 text-muted-foreground", compact ? "size-3.5" : "size-4")}
      />
      <span className="sr-only">to</span>
      <span className="truncate">{route.destination}</span>
    </span>
  );
}
