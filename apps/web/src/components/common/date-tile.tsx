import type { ISODate } from "@excelcabs/types";
import { cn } from "@excelcabs/ui/lib/utils";

import { formatDayMonth } from "@/lib/datetime";

interface DateTileProps {
  /** `YYYY-MM-DD`. */
  date: ISODate;
  className?: string;
}

/** Square tile with the day number over the month ("24" over "SEP"), for booking rows. */
export function DateTile({ date, className }: DateTileProps) {
  const [day = "", month = ""] = formatDayMonth(date).split(" ");
  return (
    <time
      dateTime={date}
      data-slot="date-tile"
      className={cn(
        "flex size-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft leading-none text-primary",
        className,
      )}
    >
      <span className="text-xl font-bold tracking-tight tabular-nums">{day}</span>
      <span className="mt-1 text-[11px] font-semibold tracking-wide text-primary/80 uppercase">
        {month}
      </span>
    </time>
  );
}
