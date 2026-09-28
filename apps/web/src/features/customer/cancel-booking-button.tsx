"use client";

import type { BookingDetails } from "@excelcabs/types";
import { Button, type ButtonProps } from "@excelcabs/ui/components/button";
import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { useState } from "react";

import { formatDayMonth, formatTime } from "@/lib/datetime";
import { formatRoute } from "@/lib/format";
import { useCancelBooking } from "@/queries/bookings";

type CancelBookingButtonProps = Pick<ButtonProps, "variant" | "size" | "className" | "children"> & {
  /** Render only when `booking.canCancel` is true. */
  booking: BookingDetails;
};

/** "Cancel" button with its confirmation dialog; the cancelled booking updates in every list. */
export function CancelBookingButton({
  booking,
  children = "Cancel",
  ...buttonProps
}: CancelBookingButtonProps) {
  const [open, setOpen] = useState(false);
  const cancelBooking = useCancelBooking();
  const { trip } = booking;

  async function confirm() {
    await cancelBooking.mutateAsync({ id: booking.id });
    toast.success("Booking cancelled");
  }

  return (
    <>
      <Button type="button" {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Cancel booking ${booking.id}?`}
        description={`Your seat on the ${formatTime(trip.departureTime)} ${formatRoute(trip.route)} trip on ${formatDayMonth(trip.date)} will be released.`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        tone="destructive"
        onConfirm={confirm}
      />
    </>
  );
}
