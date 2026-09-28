import * as React from "react";

import { controlClassName } from "../lib/styles";
import { cn } from "../lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  /** Decorative icon shown inside the field on the left (e.g. a lucide icon). */
  icon?: React.ReactNode;
};

function Input({ className, type, icon, ...props }: InputProps) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlClassName,
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        icon ? "pl-10" : null,
        className,
      )}
      {...props}
    />
  );

  if (!icon) return input;

  return (
    <div data-slot="input-wrapper" className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-primary [&_svg:not([class*='size-'])]:size-4.5"
      >
        {icon}
      </span>
      {input}
    </div>
  );
}

export { Input, type InputProps };
