// @ts-check
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist",
    "**/*.gen.ts",
    "src/components/ui/*",
    "pb_migrations",
    "pb_hooks",
    "pb_data",
    "node_modules",
  ]),
  pluginQuery.configs["flat/recommended"],
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  // reactRefresh.configs.vite,
  eslintPluginBetterTailwindcss.configs.recommended,
  {
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/styles.css",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": [
        "error",
        { extraHOCs: ["Route"] },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
