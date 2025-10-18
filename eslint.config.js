// eslint.config.js (ESLint v9 flat config)
import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser, // window, document, etc.
      },
    },
  },
  js.configs.recommended, // base rules from ESLint team
  {
    rules: {
      // Keep code clean and predictable
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      // Let Prettier handle formatting; avoid rule clashes
      ...eslintConfigPrettier.rules,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
];
