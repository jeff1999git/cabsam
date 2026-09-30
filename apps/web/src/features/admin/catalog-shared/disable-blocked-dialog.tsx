"use client";

import { Button } from "@excelcabs/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@excelcabs/ui/components/dialog";
import { CalendarDays } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { pluralize } from "@/lib/format";

interface DisableBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the admin tried to disable, e.g. "Bus 2" or "Titto Excel". */
  label: string;
  upcomingTripCount: number;
  /** `/admin/trips` filtered to the item, where its trips can be reassigned or cancelled. */
  tripsHref: Route;
}

/** Explains why an item with upcoming trips cannot be disabled and links to those trips. */
export function DisableBlockedDialog({
  open,
  onOpenChange,
  label,
  upcomingTripCount,
  tripsHref,
}: DisableBlockedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Can&apos;t disable {label} yet</DialogTitle>
          <DialogDescription>
            {label} has {pluralize(upcomingTripCount, "upcoming trip")}. Reassign or cancel them
            before disabling.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          <Button asChild>
            <Link href={tripsHref}>
              <CalendarDays />
              View trips
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
