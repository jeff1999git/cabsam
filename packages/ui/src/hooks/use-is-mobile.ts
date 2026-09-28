import { useMediaQuery } from "./use-media-query";

/** Matches Tailwind's `md` breakpoint: below it is "mobile". */
export const MOBILE_BREAKPOINT_PX = 768;

/** `true` below the `md` breakpoint. `false` on the server and during hydration. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
}
