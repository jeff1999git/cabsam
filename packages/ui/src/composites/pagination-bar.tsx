import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../components/button";
import { cn } from "../lib/utils";

type PaginationBarProps = Omit<React.ComponentProps<"nav">, "children"> & {
  /** 1-based. */
  page: number;
  pageCount: number;
  /** Total number of items across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  /** Disables navigation while the next page loads. */
  pending?: boolean;
};

/** "N results · Page x of y" with Previous / Next (icon-only on mobile). */
function PaginationBar({
  page,
  pageCount,
  total,
  onPageChange,
  pending = false,
  className,
  ...props
}: PaginationBarProps) {
  const lastPage = Math.max(pageCount, 1);

  return (
    <nav
      aria-label="Pagination"
      data-slot="pagination-bar"
      className={cn("flex items-center justify-between gap-3", className)}
      {...props}
    >
      <p aria-live="polite" className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">{total}</span>{" "}
        {total === 1 ? "result" : "results"}
        <span aria-hidden="true"> · </span>
        <span className="whitespace-nowrap">
          Page {page} of {lastPage}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 sm:h-8"
          disabled={pending || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 sm:h-8"
          disabled={pending || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="sr-only sm:not-sr-only">Next</span>
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

export { PaginationBar, type PaginationBarProps };
