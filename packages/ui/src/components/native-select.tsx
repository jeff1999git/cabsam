import * as React from "react";
import { ChevronDown } from "lucide-react";

import { controlClassName } from "../lib/styles";
import { cn } from "../lib/utils";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
  /** Decorative icon shown inside the field on the left (e.g. a lucide icon). */
  icon?: React.ReactNode;
};

/**
 * Styled native `<select>` — the default choice for forms and filters (native pickers work best on
 * mobile). `className` is applied to the wrapper so it controls layout/width; it is full width by
 * default.
 */
function NativeSelect({ className, size = "default", icon, ...props }: NativeSelectProps) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative w-full has-[select:disabled]:opacity-50", className)}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-primary [&_svg:not([class*='size-'])]:size-4.5"
        >
          {icon}
        </span>
      ) : null}
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          controlClassName,
          "cursor-pointer appearance-none truncate pr-9 data-[size=sm]:h-9 data-[size=sm]:py-1 data-[size=sm]:text-sm md:data-[size=sm]:h-8",
          icon ? "pl-10" : null,
          "disabled:opacity-100",
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

function NativeSelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup(props: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup, type NativeSelectProps };
