import * as React from "react";

import { cn } from "../lib/utils";

type PageHeaderProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons for the page; they wrap below the title on mobile and sit on the right from `sm`. */
  actions?: React.ReactNode;
  /** Slot above the title for a back link (the app renders its own `<Link>`). */
  back?: React.ReactNode;
};

/** The page's `<h1>` block. */
function PageHeader({ title, description, actions, back, className, ...props }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn("flex flex-col gap-3", className)} {...props}>
      {back ? <div className="-ml-1 flex">{back}</div> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description ? (
            <p className="text-sm text-pretty text-muted-foreground sm:text-base">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export { PageHeader, type PageHeaderProps };
