import type { TripStatus } from "@excelcabs/types";
import { StatusBadge, type StatusTone } from "@excelcabs/ui/composites/status-badge";

/** How each trip status is presented: `scheduled` reads as "Upcoming". */
export const TRIP_STATUS_META: Record<TripStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: "Upcoming", tone: "info" },
  in_progress: { label: "In Progress", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export function tripStatusLabel(status: TripStatus): string {
  return TRIP_STATUS_META[status].label;
}

export function TripStatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  const { label, tone } = TRIP_STATUS_META[status];
  return (
    <StatusBadge tone={tone} dot={status === "in_progress"} className={className}>
      {label}
    </StatusBadge>
  );
}
