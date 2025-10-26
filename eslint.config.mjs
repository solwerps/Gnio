// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import("eslint").Linter.FlatConfig[]} */
const config = [
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "coverage/**", "dist/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { project: true, tsconfigRootDir: __dirname } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "eslint-comments/no-unused-disable": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }]
    }
  }
];

export default config;
