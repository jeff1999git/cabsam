import type { AccountStatus } from "@excelcabs/types";
import { StatusBadge, type StatusTone } from "@excelcabs/ui/composites/status-badge";

export const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  disabled: { label: "Disabled", tone: "muted" },
};

export function accountStatusLabel(status: AccountStatus): string {
  return ACCOUNT_STATUS_META[status].label;
}

export function AccountStatusBadge({
  status,
  className,
}: {
  status: AccountStatus;
  className?: string;
}) {
  const { label, tone } = ACCOUNT_STATUS_META[status];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}
