//@ts-check

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx,mjs}"],
    extends: [
      js.configs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      reactCompiler.configs.recommended,
      unicorn.configs.recommended,
      prettier,
    ],
    plugins: {
      "import-x": importX,
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      },
      globals: globals.browser,
    },
    rules: {
      // TypeScript Rules
      "@typescript-eslint/consistent-type-exports": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/explicit-member-accessibility": "warn",
      "@typescript-eslint/prefer-readonly": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "all", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/restrict-template-expressions": [
        "warn",
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],

      // Import Rules
      "import-x/namespace": "error",
      "import-x/order": [
        "warn",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "parent", "sibling", "index", "type"],
        },
      ],

      // Unicorn Rules
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            camelCase: true,
          },
        },
      ],
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import-x/no-named-as-default-member": "off",
      "import-x/no-named-as-default": "off",
      "import-x/default": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
]);
