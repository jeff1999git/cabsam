import { cn } from "@excelcabs/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md";
  /** Wraps the logo in a link when given. */
  href?: Route;
  /** Hide the wordmark (the lettermark keeps an accessible name). */
  wordmark?: boolean;
  className?: string;
}

/** Navy "E" lettermark next to "EXCEL CABS" over "PRIVATE SHUTTLE BUS SERVICE". */
export function Logo({ size = "sm", href, wordmark = true, className }: LogoProps) {
  const md = size === "md";
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground",
          md ? "size-11 text-2xl" : "size-9 text-lg",
        )}
      >
        E
      </span>
      {wordmark ? (
        <span className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight text-foreground", md ? "text-lg" : "text-sm")}>
            EXCEL CABS
          </span>
          <span
            className={cn(
              "mt-1 font-semibold tracking-wider text-primary uppercase",
              md ? "text-[10px]" : "text-[9px]",
            )}
          >
            Private Shuttle Bus Service
          </span>
        </span>
      ) : (
        <span className="sr-only">Excel Cabs</span>
      )}
    </>
  );
  const classes = cn("inline-flex items-center gap-2.5", className);

  if (href) {
    return (
      <Link
        href={href}
        className={cn(classes, "rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40")}
      >
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}
