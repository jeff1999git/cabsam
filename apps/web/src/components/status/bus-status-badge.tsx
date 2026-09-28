import type { BusStatus } from "@excelcabs/types";
import { StatusBadge, type StatusTone } from "@excelcabs/ui/composites/status-badge";

export const BUS_STATUS_META: Record<BusStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  maintenance: { label: "Maintenance", tone: "warning" },
  inactive: { label: "Inactive", tone: "muted" },
};

export function busStatusLabel(status: BusStatus): string {
  return BUS_STATUS_META[status].label;
}

export function BusStatusBadge({ status, className }: { status: BusStatus; className?: string }) {
  const { label, tone } = BUS_STATUS_META[status];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}
