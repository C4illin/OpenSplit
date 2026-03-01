// @ts-check
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist",
    "src/types/pocketbase-types.gen.ts",
    "src/components/ui",
  ]),
  pluginQuery.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      eslintPluginBetterTailwindcss.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/styles.css",
      },
    },
  },
]);
