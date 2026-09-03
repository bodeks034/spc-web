import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Cilj je hvatanje stvarnih grešaka (nepostojeće promenljive, loše hook
 * zavisnosti), ne stilsko doterivanje 500+ postojećih fajlova. Zato je
 * stilski sloj isključen, a pravila koja bi zatrpala izlaz su warning.
 */
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**",
      "test-results/**",
      "playwright-report/**",
      "deploy/**",
      "erp-drop/**",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Konvencija u kodu: _ prefiks znači "namerno neiskorišćeno".
      "no-unused-vars": ["warn", {
        args: "none",
        varsIgnorePattern: "^_",
        caughtErrors: "none",
        ignoreRestSiblings: true,
      }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-undef": "error",
      "no-console": "off",
      // Stilski nalazi u zatečenom kodu — vredni pažnje, ali ne ruše CI.
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "no-loss-of-precision": "warn",
      "preserve-caught-error": "warn",
    },
  },

  {
    files: ["tests/**/*.js", "e2e/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];
