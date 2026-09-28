"use client";

import * as React from "react";

import { Button } from "../components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/dialog";
import { cn } from "../lib/utils";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** `id` of the `<form>` rendered in `children`; the footer's submit button targets it. */
  formId: string;
  submitLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** Submitting: the submit button shows a spinner and the dialog cannot be dismissed. */
  pending?: boolean;
  submitDisabled?: boolean;
  /** The form (body). It scrolls between the fixed header and footer. */
  children: React.ReactNode;
  /** Classes for the dialog panel, e.g. `sm:max-w-xl`. */
  className?: string;
};

/**
 * Dialog shell for create/edit forms: fixed header and footer (Cancel + submit), scrollable body,
 * full width on mobile. Clicking the backdrop does not close it, so typed input is not lost.
 */
function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel,
  cancelLabel = "Cancel",
  pending = false,
  submitDisabled = false,
  children,
  className,
}: FormDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (pending && !nextOpen) return;
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        onInteractOutside={(event) => event.preventDefault()}
        className={cn("flex flex-col gap-0 overflow-hidden p-0 sm:p-0", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <DialogHeader className="border-b px-5 py-4 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div data-slot="form-dialog-body" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} loading={pending} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { FormDialog, type FormDialogProps };
