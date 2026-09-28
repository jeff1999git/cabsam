"use client";

import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { SearchInput } from "@excelcabs/ui/composites/search-input";
import { useId } from "react";

export interface StatusOption<TStatus extends string> {
  value: TStatus;
  label: string;
}

interface CatalogToolbarProps<TStatus extends string> {
  search?: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    /** Accessible name of the search field. */
    label: string;
  };
  status: {
    /** `""` means every status. */
    value: TStatus | "";
    onValueChange: (value: TStatus | "") => void;
    options: readonly StatusOption<TStatus>[];
  };
  /** Result count, e.g. "6 buses". */
  summary?: string;
}

/** Search field, status filter and result count above a catalogue list. */
export function CatalogToolbar<TStatus extends string>({
  search,
  status,
  summary,
}: CatalogToolbarProps<TStatus>) {
  const statusId = useId();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {search ? (
        <SearchInput
          value={search.value}
          onValueChange={search.onValueChange}
          placeholder={search.placeholder}
          aria-label={search.label}
          className="sm:max-w-xs"
        />
      ) : null}
      <label htmlFor={statusId} className="sr-only">
        Status
      </label>
      <NativeSelect
        id={statusId}
        value={status.value}
        onChange={(event) => {
          const next = status.options.find((option) => option.value === event.target.value);
          status.onValueChange(next ? next.value : "");
        }}
        className="sm:w-44"
      >
        <NativeSelectOption value="">All statuses</NativeSelectOption>
        {status.options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {summary ? (
        <p className="text-sm text-muted-foreground sm:ml-auto" aria-live="polite">
          {summary}
        </p>
      ) : null}
    </div>
  );
}
