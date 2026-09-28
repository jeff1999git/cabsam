import * as React from "react";

import { cn } from "../lib/utils";

type DetailListItem = {
  /** Also used as the React key, so keep labels unique within a list. */
  label: string;
  value: React.ReactNode;
  /** Span both columns (for long values) when `columns` is 2. */
  fullWidth?: boolean;
};

type DetailListProps = Omit<React.ComponentProps<"dl">, "children"> & {
  items: readonly DetailListItem[];
  /** 2 = two columns from `sm`; always one column on mobile. */
  columns?: 1 | 2;
};

/** Label/value pairs rendered as a description list. */
function DetailList({ items, columns = 1, className, ...props }: DetailListProps) {
  return (
    <dl
      data-slot="detail-list"
      className={cn("grid gap-x-6 gap-y-4", columns === 2 && "sm:grid-cols-2", className)}
      {...props}
    >
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", item.fullWidth && "sm:col-span-full")}>
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm break-words text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export { DetailList, type DetailListItem, type DetailListProps };
