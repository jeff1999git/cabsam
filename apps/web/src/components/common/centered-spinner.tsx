import { Spinner } from "@excelcabs/ui/components/spinner";
import { cn } from "@excelcabs/ui/lib/utils";

interface CenteredSpinnerProps {
  /** What is loading, announced to assistive tech. */
  label?: string;
  className?: string;
}

/** Full-area loading indicator for route fallbacks and guards. */
export function CenteredSpinner({ label = "Loading", className }: CenteredSpinnerProps) {
  return (
    <div className={cn("flex min-h-[50vh] items-center justify-center", className)}>
      <Spinner className="size-6 text-primary" aria-label={label} />
    </div>
  );
}
