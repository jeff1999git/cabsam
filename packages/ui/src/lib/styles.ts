import { cn } from "./utils";

// Class recipes shared by several primitives, so related controls and surfaces stay identical.

/**
 * Text controls: input, textarea, native select. Filled style — a tinted field with no visible
 * border until hover/focus; 44px tall on touch screens, 40px from `md`.
 */
export const controlClassName = cn(
  "h-11 w-full min-w-0 rounded-lg border border-transparent bg-field px-3.5 py-2 text-base font-medium text-foreground outline-none md:h-10 md:text-sm",
  "transition-[color,background-color,border-color,box-shadow] placeholder:font-normal placeholder:text-muted-foreground",
  "hover:border-input",
  "selection:bg-primary selection:text-primary-foreground",
  "focus-visible:border-ring focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/20",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

/** Backdrop behind modal surfaces (dialog, alert dialog, sheet). */
export const overlayClassName =
  "fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/** Top-right "X" of dialogs and sheets (36px hit area). */
export const closeButtonClassName =
  "absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none [&_svg]:size-4";

/**
 * Small uppercase label used above search fields and in dense summaries
 * ("SELECT DATE", "BOOKING ID").
 */
export const eyebrowClassName =
  "text-xs font-semibold tracking-wider text-foreground/70 uppercase";
