import type { TimeHM } from "@excelcabs/types";
import { cn } from "@excelcabs/ui/lib/utils";

interface TimeTileProps {
  /** 24-hour `HH:mm`. */
  time: TimeHM;
  /** Navy filled tile (a selected trip row). */
  selected?: boolean;
  className?: string;
}

function splitTime(time: TimeHM): { clock: string; meridiem: "AM" | "PM" } {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return {
    clock: `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    meridiem: hours < 12 ? "AM" : "PM",
  };
}

/** Square tile with "07:00" over "AM"; soft by default, navy when `selected`. */
export function TimeTile({ time, selected = false, className }: TimeTileProps) {
  const { clock, meridiem } = splitTime(time);
  return (
    <div
      data-slot="time-tile"
      data-selected={selected || undefined}
      className={cn(
        "flex size-16 shrink-0 flex-col items-center justify-center rounded-lg leading-none transition-colors",
        selected ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary",
        className,
      )}
    >
      <span className="text-base font-bold tracking-tight tabular-nums">{clock}</span>
      <span
        className={cn(
          "mt-1 text-[11px] font-semibold tracking-wide uppercase",
          selected ? "text-primary-foreground/80" : "text-primary/80",
        )}
      >
        {meridiem}
      </span>
    </div>
  );
}
