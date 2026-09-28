import * as React from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "../lib/utils";

/** Loading indicator announced to assistive tech; override `aria-label` to say what is loading. */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderCircle
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Spinner };
