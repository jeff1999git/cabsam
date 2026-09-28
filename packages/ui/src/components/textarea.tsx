import * as React from "react";

import { controlClassName } from "../lib/styles";
import { cn } from "../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClassName, "flex field-sizing-content h-auto min-h-20 py-2.5 md:h-auto", className)}
      {...props}
    />
  );
}

export { Textarea };
