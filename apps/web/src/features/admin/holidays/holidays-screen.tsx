"use client";

import type { Holiday, ISODate } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { Section } from "@excelcabs/ui/composites/section";
import { StatusBadge } from "@excelcabs/ui/composites/status-badge";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import { DateTile } from "@/components/common/date-tile";
import { QueryError } from "@/components/common/query-error";
import { useEditor } from "@/features/admin/catalog-shared/use-editor";
import { diffDays, formatDateLong, formatDayMonth, today } from "@/lib/datetime";
import { pluralize } from "@/lib/format";
import { useDeleteHoliday, useHolidays } from "@/queries/holidays";

import { HolidayFormDialog } from "./holiday-form-dialog";

const SKELETON_ROWS = 3;

/** "Today", "Tomorrow", "In 4 days", "Yesterday", "12 days ago". */
function describeOffset(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

interface HolidayRowProps {
  holiday: Holiday;
  todayDate: ISODate;
  onDelete: (holiday: Holiday) => void;
}

function HolidayRow({ holiday, todayDate, onDelete }: HolidayRowProps) {
  const offset = diffDays(todayDate, holiday.date);
  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <DateTile date={holiday.date} className={offset < 0 ? "opacity-60" : undefined} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{formatDateLong(holiday.date)}</p>
            <StatusBadge tone={offset < 0 ? "muted" : offset <= 1 ? "warning" : "info"}>
              {describeOffset(offset)}
            </StatusBadge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{holiday.reason}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="text-muted-foreground sm:shrink-0"
        onClick={() => onDelete(holiday)}
        aria-label={`Delete holiday on ${formatDayMonth(holiday.date)}`}
      >
        <Trash2 />
        Delete
      </Button>
    </li>
  );
}

function HolidayListSkeleton() {
  return (
    <ul aria-busy="true" className="flex flex-col gap-3">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
          <Skeleton className="size-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="hidden h-10 w-20 sm:block" />
        </li>
      ))}
    </ul>
  );
}

/** `/admin/holidays`: days the shuttle does not run, grouped into upcoming and past. */
export function AdminHolidaysScreen() {
  const [todayDate] = useState(today);
  const holidays = useHolidays();
  const editor = useEditor();
  const deleteHoliday = useDeleteHoliday();
  const [deleting, setDeleting] = useState<{ holiday: Holiday; open: boolean } | null>(null);

  const upcoming = holidays.data?.filter((holiday) => holiday.date >= todayDate) ?? [];
  const past = holidays.data?.filter((holiday) => holiday.date < todayDate).toReversed() ?? [];

  function requestDelete(holiday: Holiday) {
    setDeleting({ holiday, open: true });
  }

  async function confirmDelete(holiday: Holiday) {
    await deleteHoliday.mutateAsync(holiday.id);
    toast.success(`Holiday on ${formatDayMonth(holiday.date)} deleted`);
  }

  const addButton = (
    <Button type="button" onClick={editor.create}>
      <Plus />
      Add Holiday
    </Button>
  );

  let content: ReactNode;
  if (holidays.isPending) {
    content = <HolidayListSkeleton />;
  } else if (holidays.isError) {
    content = (
      <QueryError
        error={holidays.error}
        onRetry={() => void holidays.refetch()}
        retrying={holidays.isFetching}
      />
    );
  } else if (holidays.data.length === 0) {
    content = (
      <EmptyState
        icon={<CalendarOff />}
        title="No holidays yet"
        description="Add the dates the shuttle doesn't run. Trips scheduled on those days are cancelled."
        action={addButton}
      />
    );
  } else {
    content = (
      <>
        <Section
          title="Upcoming"
          actions={<StatusBadge tone="info">{pluralize(upcoming.length, "holiday")}</StatusBadge>}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarOff />}
              title="No upcoming holidays"
              description="The shuttle runs every day for now."
              action={addButton}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((holiday) => (
                <HolidayRow
                  key={holiday.id}
                  holiday={holiday}
                  todayDate={todayDate}
                  onDelete={requestDelete}
                />
              ))}
            </ul>
          )}
        </Section>
        {past.length > 0 ? (
          <Section
            title="Past"
            actions={<StatusBadge tone="muted">{pluralize(past.length, "holiday")}</StatusBadge>}
          >
            <ul className="flex flex-col gap-3">
              {past.map((holiday) => (
                <HolidayRow
                  key={holiday.id}
                  holiday={holiday}
                  todayDate={todayDate}
                  onDelete={requestDelete}
                />
              ))}
            </ul>
          </Section>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Holidays"
        description="Days the shuttle does not run. Adding one cancels that day's trips."
        actions={addButton}
      />

      <Alert variant="info">
        <CalendarOff />
        <AlertTitle>Every Sunday is a holiday — no trips run on Sundays.</AlertTitle>
        <AlertDescription>List the other days the shuttle does not run here.</AlertDescription>
      </Alert>

      {content}

      <HolidayFormDialog
        key={editor.key}
        open={editor.open}
        onOpenChange={editor.onOpenChange}
        minDate={todayDate}
      />

      {deleting ? (
        <ConfirmDialog
          open={deleting.open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDeleting({ ...deleting, open: false });
          }}
          title={`Delete holiday on ${formatDayMonth(deleting.holiday.date)}?`}
          description="Trips cancelled for this holiday will not be restored."
          confirmLabel="Delete holiday"
          tone="destructive"
          onConfirm={() => confirmDelete(deleting.holiday)}
        />
      ) : null}
    </div>
  );
}
