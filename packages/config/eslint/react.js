import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { base } from "./base.js";

/** Shared flat config for React component packages (hooks rules incl. React Compiler rules). */
export const react = defineConfig([
  base,
  reactHooks.configs.flat.recommended,
  { files: ["**/*.{ts,tsx}"], languageOptions: { globals: globals.browser } },
]);

export default react;
