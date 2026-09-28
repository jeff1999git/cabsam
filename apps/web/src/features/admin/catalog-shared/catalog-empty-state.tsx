"use client";

import { Button } from "@excelcabs/ui/components/button";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface CatalogEmptyStateProps {
  icon: ReactNode;
  /** Plural noun, e.g. "buses". */
  noun: string;
  /** Shown when nothing exists yet. */
  description: string;
  /** A search or status filter is active, so the list may be empty only because of it. */
  filtered: boolean;
  onClearFilters: () => void;
  onAdd: () => void;
  addLabel: string;
}

/** "Nothing here" panel for catalogue lists: clear the filters, or add the first item. */
export function CatalogEmptyState({
  icon,
  noun,
  description,
  filtered,
  onClearFilters,
  onAdd,
  addLabel,
}: CatalogEmptyStateProps) {
  if (filtered) {
    return (
      <EmptyState
        icon={icon}
        title={`No ${noun} match your filters`}
        description="Try a different search or show all statuses."
        action={
          <Button type="button" variant="soft" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={icon}
      title={`No ${noun} yet`}
      description={description}
      action={
        <Button type="button" onClick={onAdd}>
          <Plus />
          {addLabel}
        </Button>
      }
    />
  );
}
