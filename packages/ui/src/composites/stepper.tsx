import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "../lib/utils";

type StepperProps = Omit<React.ComponentProps<"ol">, "children"> & {
  /** Step labels; must be unique. */
  steps: readonly string[];
  /** 0-based index of the current step; `steps.length` marks every step complete. */
  current: number;
};

type StepState = "complete" | "current" | "upcoming";

function stepState(index: number, current: number): StepState {
  if (index < current) return "complete";
  return index === current ? "current" : "upcoming";
}

/**
 * Horizontal progress indicator: numbered circles joined by lines. Keep labels short (one word)
 * so all of them fit at 375px.
 */
function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <ol
      aria-label="Progress"
      data-slot="stepper"
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    >
      {steps.map((step, index) => {
        const state = stepState(index, current);
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            data-state={state}
            className={cn("flex items-center gap-2", !isLast && "flex-1")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:size-8 sm:text-sm",
                state === "complete" && "bg-primary text-primary-foreground",
                state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary-soft",
                state === "upcoming" && "bg-primary-soft text-muted-foreground",
              )}
            >
              {state === "complete" ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm whitespace-nowrap sm:text-base",
                state === "current" ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                state === "complete" && "text-foreground",
              )}
            >
              {step}
              {state === "complete" ? <span className="sr-only"> (completed)</span> : null}
            </span>
            {isLast ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 min-w-3 flex-1 rounded-full",
                  state === "complete" ? "bg-primary" : "bg-primary-soft-strong",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export { Stepper, type StepperProps };
