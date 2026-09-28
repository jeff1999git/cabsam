"use client";

import { Button } from "@excelcabs/ui/components/button";
import { cn } from "@excelcabs/ui/lib/utils";
import { Ban, CircleCheck, Pencil } from "lucide-react";

interface CatalogRowActionsProps {
  /** Names the item for assistive tech: "Edit Bus 2", "Disable Bus 2". */
  label: string;
  active: boolean;
  /** The item's status is being saved. */
  busy: boolean;
  onEdit: () => void;
  onDisable: () => void;
  onEnable: () => void;
  /** `sm` in table rows, `default` (44px on touch screens) in mobile cards. */
  size?: "sm" | "default";
  className?: string;
}

/** [Edit] plus [Disable] or [Enable] for a catalogue row. */
export function CatalogRowActions({
  label,
  active,
  busy,
  onEdit,
  onDisable,
  onEnable,
  size = "sm",
  className,
}: CatalogRowActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button type="button" variant="soft" size={size} onClick={onEdit} aria-label={`Edit ${label}`}>
        <Pencil />
        Edit
      </Button>
      {active ? (
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-muted-foreground"
          disabled={busy}
          onClick={onDisable}
          aria-label={`Disable ${label}`}
        >
          <Ban />
          Disable
        </Button>
      ) : (
        <Button
          type="button"
          variant="soft"
          size={size}
          loading={busy}
          onClick={onEnable}
          aria-label={`Enable ${label}`}
        >
          <CircleCheck />
          Enable
        </Button>
      )}
    </div>
  );
}
