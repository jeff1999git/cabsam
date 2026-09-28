"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { useBuses } from "@/queries/buses";
import { useDrivers } from "@/queries/drivers";

interface FilterChipProps {
  label: ReactNode;
  removeLabel: string;
  onRemove: () => void;
}

function FilterChip({ label, removeLabel, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pr-1 pl-3 text-xs font-semibold text-primary">
      {label}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="inline-flex size-6 items-center justify-center rounded-full outline-none hover:bg-primary-soft-strong focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

interface EntityChipProps {
  id: string;
  onRemove: () => void;
}

export function BusFilterChip({ id, onRemove }: EntityChipProps) {
  const buses = useBuses();
  const bus = buses.data?.find((candidate) => candidate.id === id);
  return (
    <FilterChip
      label={`Bus: ${bus?.name ?? (buses.isPending ? "…" : "unknown")}`}
      removeLabel="Remove bus filter"
      onRemove={onRemove}
    />
  );
}

export function DriverFilterChip({ id, onRemove }: EntityChipProps) {
  const drivers = useDrivers();
  const driver = drivers.data?.find((candidate) => candidate.id === id);
  return (
    <FilterChip
      label={`Driver: ${driver?.name ?? (drivers.isPending ? "…" : "unknown")}`}
      removeLabel="Remove driver filter"
      onRemove={onRemove}
    />
  );
}
