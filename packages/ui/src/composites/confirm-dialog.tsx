"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/alert-dialog";
import { Button } from "../components/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Rendered inside a `<p>`: keep it to inline content and use `children` for anything richer. */
  description: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  tone?: "default" | "destructive";
  /**
   * Return a promise to let the dialog manage itself: it shows a pending state until the promise
   * settles, closes on success and stays open on rejection (report the error yourself, e.g. a
   * toast). Return nothing to control closing yourself (typically with `pending`).
   */
  onConfirm: () => void | Promise<unknown>;
  /** External pending state (e.g. a mutation's `isPending`). */
  pending?: boolean;
  /** Extra body content between the description and the buttons. */
  children?: React.ReactNode;
};

/**
 * Controlled confirmation dialog. While pending, the confirm button shows a spinner, both buttons
 * are disabled and the dialog cannot be dismissed.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  pending = false,
  children,
}: ConfirmDialogProps) {
  const [settling, setSettling] = React.useState(false);
  const busy = pending || settling;

  function handleOpenChange(nextOpen: boolean) {
    if (busy && !nextOpen) return;
    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    const result = onConfirm();
    if (!(result instanceof Promise)) return;

    setSettling(true);
    try {
      await result;
      onOpenChange(false);
    } catch {
      // The caller reports the failure; staying open lets the user retry or cancel.
    } finally {
      setSettling(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            loading={busy}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog, type ConfirmDialogProps };
