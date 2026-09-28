import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold outline-none select-none",
    "transition-[color,background-color,border-color,box-shadow,opacity]",
    "focus-visible:ring-[3px] focus-visible:ring-ring/40",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    // While loading, the spinner replaces any icons passed as children.
    "[&[data-loading]>svg:not([data-slot=spinner])]:hidden",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        /** Tinted secondary action (Sign in, Select, View). */
        soft: "bg-primary-soft text-primary hover:bg-primary-soft-strong",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-input bg-card shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        /** 44px on touch screens, 40px from `md`. */
        default: "h-11 px-4 py-2 has-[>svg]:px-3.5 md:h-10",
        sm: "h-9 gap-1.5 rounded-md px-3 text-xs has-[>svg]:px-2.5 md:h-8",
        /** 48px tall — primary actions (Continue, Confirm Booking, Start Trip). */
        lg: "h-12 rounded-xl px-6 text-base has-[>svg]:px-5",
        icon: "size-11 md:size-10",
        "icon-sm": "size-9 md:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * Shows a spinner, disables the button and sets `aria-busy`. With `asChild` the child is marked
     * `aria-disabled` + `data-loading` instead (no spinner is injected into the child).
     */
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        className={classes}
        {...props}
      >
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {loading ? (
        <LoaderCircle data-slot="spinner" aria-hidden="true" className="animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

export { Button, buttonVariants, type ButtonProps };
