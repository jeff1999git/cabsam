import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // UI code must talk to services, never to the mock data layer directly.
      "no-restricted-imports": [
        "error",
        {
          // `paths` matches the bare package only; a `group: ["sonner"]` pattern would also match
          // '@excelcabs/ui/components/sonner' (gitignore-style segment match).
          paths: [
            {
              name: "sonner",
              message: "Import toast from '@excelcabs/ui/components/sonner' (single toast store).",
            },
          ],
          patterns: [
            {
              group: ["@/lib/mock", "@/lib/mock/*", "@/services/mock", "@/services/mock/*"],
              message:
                "Import from '@/services/*' (service abstraction) instead of the mock data layer.",
            },
          ],
        },
      ],
    },
  },
  {
    // The service layer is the only place allowed to reach the mock data layer.
    files: ["src/services/**", "src/lib/mock/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Playwright fixtures call `use()`, which rules-of-hooks mistakes for a React hook.
    files: ["e2e/**", "playwright.config.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
  ]),
]);
