"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "../components/input";
import { cn } from "../lib/utils";

type SearchInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "ref"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name of the clear button. */
  clearLabel?: string;
};

/**
 * Controlled search field with a leading icon and a clear button (shown when non-empty; it returns
 * focus to the input). `className` is applied to the wrapper so it controls layout/width. Give it an
 * accessible name via `aria-label` or a `<label htmlFor>`.
 */
function SearchInput({
  value,
  onValueChange,
  clearLabel = "Clear search",
  className,
  ...props
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleClear() {
    onValueChange("");
    inputRef.current?.focus();
  }

  return (
    <div data-slot="search-input" className={cn("relative w-full", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="pr-10 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={handleClear}
          className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export { SearchInput, type SearchInputProps };
