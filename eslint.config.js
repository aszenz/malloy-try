import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintReact from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";

export default tseslint.config({
  extends: [tseslint.configs.strictTypeChecked],
  ignores: ["dist"],
  settings: {
    react: { version: "18.3" },
  },
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: "latest",
    globals: globals.browser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
    react: eslintReact,
    "react-compiler": reactCompiler,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    ...eslintReact.configs.recommended.rules,
    ...eslintReact.configs["jsx-runtime"].rules,
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    ...reactCompiler.configs.recommended.rules,
  },
});
