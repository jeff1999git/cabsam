import type { BookingStatus } from "@excelcabs/types";
import { StatusBadge, type StatusTone } from "@excelcabs/ui/composites/status-badge";

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function bookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_META[status].label;
}

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const { label, tone } = BOOKING_STATUS_META[status];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}
