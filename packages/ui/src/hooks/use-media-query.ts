import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether `query` (e.g. `"(min-width: 1024px)"`) currently matches, updating live.
 * Always `false` during SSR and hydration, so prefer CSS breakpoints for layout; use this only for
 * behaviour that cannot be expressed in CSS.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
