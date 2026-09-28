import * as React from "react";

import { cn } from "../lib/utils";

type SectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned controls next to the title (wrap below it on narrow screens). */
  actions?: React.ReactNode;
};

/** Titled block inside a page (`<section>` labelled by its `<h2>`). */
function Section({ title, description, actions, className, children, ...props }: SectionProps) {
  const headingId = React.useId();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="section"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h2 id={headingId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export { Section, type SectionProps };
