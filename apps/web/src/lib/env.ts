/**
 * Public runtime configuration. Each variable is read with a literal `process.env.NEXT_PUBLIC_…`
 * expression so Next.js can inline it into the client bundle.
 */

function readString(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  return value ? value : fallback;
}

function readNonNegativeNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readBoolean(raw: string | undefined, fallback: boolean): boolean {
  const value = raw?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export const env = {
  appName: readString(process.env.NEXT_PUBLIC_APP_NAME, "Excel Cabs"),
  /** Base delay of mock service calls; reads take ~1×, writes ~1.5× (jittered). 0 disables it. */
  mockLatencyMs: readNonNegativeNumber(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS, 400),
  showDemoCredentials: readBoolean(process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS, true),
} as const;
