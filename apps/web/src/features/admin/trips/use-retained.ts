import { useState } from "react";

/**
 * The latest defined `value`, kept while `value` is absent — so a panel driven by a URL param can
 * keep showing its content during its close animation.
 */
export function useRetained<T>(value: T | null | undefined): T | undefined {
  const [retained, setRetained] = useState<T | undefined>(value ?? undefined);
  if (value != null && value !== retained) setRetained(value);
  return value ?? retained;
}
