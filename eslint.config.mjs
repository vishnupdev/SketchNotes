import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config.
 *
 * Next 16 removed the `next lint` command, so linting runs through ESLint
 * directly (`npm run lint`), assembled from the pieces that support ESLint 10:
 *  - @next/eslint-plugin-next — Next's own rules plus the Core Web Vitals set
 *    that backs the Performance/Best-Practices scores this project holds to;
 *  - typescript-eslint — TS parsing and its recommended rules;
 *  - eslint-plugin-react-hooks — hook rules the components rely on (several
 *    files carry `react-hooks/exhaustive-deps` disables for deliberate cases).
 *
 * `eslint-config-next`'s full preset is deliberately not spread in: it pulls in
 * eslint-plugin-react (7.37.5 still declares `eslint <= 9`) and Next's Babel
 * parser, both of which crash on ESLint 10's APIs. Swap back to the shared
 * preset once those support ESLint 10.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "legacy/**",
      "public/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
    ],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    extends: [tseslint.configs.recommended],
    // Some files carry `eslint-disable` comments for rules this narrower set
    // doesn't enable (no-var on `declare global`, no-control-regex). They're
    // correct for the full preset, so don't report them as unused.
    linterOptions: { reportUnusedDisableDirectives: "off" },
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // The two long-standing hook rules only. react-hooks 7's `recommended`
      // set also turns on the new React-Compiler diagnostics (setState-in-
      // effect, refs-in-render, …); those are worth adopting deliberately, in
      // their own pass, not as a side effect of restoring the lint command.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Underscore marks a parameter that's kept for signature compatibility
      // but deliberately unused (e.g. shared geometry helpers).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
);
