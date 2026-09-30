import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Loading placeholder. Rendered as a block-level `<span>` so it is valid anywhere text can go —
 * inside a `<p>`, `<dd>` or `<button>` as well as in layout containers.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("block animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
