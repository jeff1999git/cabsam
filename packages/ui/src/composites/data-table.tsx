import * as React from "react";

import { Skeleton } from "../components/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/table";
import { cn } from "../lib/utils";

type ResponsiveTableColumnLayout = {
  id: string;
  header: React.ReactNode;
  /** Applied to the column's cells, e.g. `"text-right"` or `"hidden lg:table-cell"`. */
  className?: string;
  headerClassName?: string;
};

type ResponsiveTableColumn<T> = ResponsiveTableColumnLayout & {
  cell: (row: T) => React.ReactNode;
};

type ResponsiveTableProps<T> = {
  columns: readonly ResponsiveTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  /** Mobile (< md) presentation of a row; usually a small card. */
  renderCard: (row: T) => React.ReactNode;
  /**
   * Makes rows and cards clickable (and keyboard-activatable). Clicks on links, buttons and other
   * controls inside the row, or on portalled content such as menus, are ignored.
   */
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Skeleton rows/cards shown while loading. */
  loadingRows?: number;
  /** Rendered instead of the table when there are no rows (and not loading). */
  empty?: React.ReactNode;
  /** Screen-reader caption describing the table. */
  caption?: React.ReactNode;
  className?: string;
};

const frameClassName = "hidden overflow-hidden rounded-xl border bg-card shadow-card md:block";
const cardListClassName = "grid gap-3 md:hidden";
const skeletonWidths = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-2/5"] as const;
const interactiveSelector = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "[role='button']",
  "[role='menuitem']",
  "[role='checkbox']",
  "[role='switch']",
].join(", ");

function skeletonWidth(index: number) {
  return skeletonWidths[index % skeletonWidths.length];
}

/** True when the event came from the row itself, not from a control or portalled content in it. */
function isRowActivation(event: React.SyntheticEvent<HTMLElement>): boolean {
  const { target, currentTarget } = event;
  if (!(target instanceof Element) || !currentTarget.contains(target)) return false;
  const control = target.closest(interactiveSelector);
  return control === null || !currentTarget.contains(control);
}

function rowActivationProps<T>(row: T, onRowClick: ((row: T) => void) | undefined) {
  if (!onRowClick) return {};

  return {
    tabIndex: 0,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (isRowActivation(event)) onRowClick(row);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onRowClick(row);
      }
    },
  };
}

/**
 * A table from `md` up and a stacked list of `renderCard()` below it. Both are rendered and toggled
 * with CSS (no layout shift on hydration), so the hidden copy is `display: none`: in tests prefer
 * role-based queries, which skip hidden elements.
 */
function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  renderCard,
  onRowClick,
  loading = false,
  loadingRows = 5,
  empty,
  caption,
  className,
}: ResponsiveTableProps<T>) {
  if (loading) {
    return (
      <ResponsiveTableSkeleton
        columns={columns}
        rowCount={loadingRows}
        caption={caption}
        className={className}
      />
    );
  }

  if (rows.length === 0) return empty ?? null;

  const clickableClassName = onRowClick
    ? "cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-inset"
    : undefined;

  return (
    <div data-slot="responsive-table" className={className}>
      <div className={frameClassName}>
        <Table>
          {caption ? <TableCaption className="sr-only">{caption}</TableCaption> : null}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                className={clickableClassName}
                {...rowActivationProps(row, onRowClick)}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={cardListClassName}>
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className={cn(clickableClassName, "rounded-xl")}
            {...rowActivationProps(row, onRowClick)}
          >
            {renderCard(row)}
          </li>
        ))}
      </ul>
    </div>
  );
}

type ResponsiveTableSkeletonProps = {
  columns: readonly ResponsiveTableColumnLayout[];
  rowCount: number;
  caption?: React.ReactNode;
  className?: string;
};

function ResponsiveTableSkeleton({
  columns,
  rowCount,
  caption,
  className,
}: ResponsiveTableSkeletonProps) {
  const rowIndexes = Array.from({ length: rowCount }, (_, index) => index);

  return (
    <div data-slot="responsive-table" aria-busy="true" className={className}>
      <span role="status" className="sr-only">
        Loading…
      </span>
      <div className={frameClassName}>
        <Table>
          {caption ? <TableCaption className="sr-only">{caption}</TableCaption> : null}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowIndexes.map((rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {columns.map((column, columnIndex) => (
                  <TableCell key={column.id} className={column.className}>
                    <Skeleton className={cn("h-4", skeletonWidth(rowIndex + columnIndex))} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={cardListClassName}>
        {rowIndexes.map((rowIndex) => (
          <li key={rowIndex} className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
            <Skeleton className={cn("h-4", skeletonWidth(rowIndex + 2))} />
            <Skeleton className={cn("h-4", skeletonWidth(rowIndex))} />
            <Skeleton className={cn("h-4", skeletonWidth(rowIndex + 1))} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export {
  ResponsiveTable,
  type ResponsiveTableColumn,
  type ResponsiveTableColumnLayout,
  type ResponsiveTableProps,
};
