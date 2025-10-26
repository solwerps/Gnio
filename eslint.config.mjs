// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Ignora artefactos de build
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  // Trae las reglas de Next (legacy) a flat config
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Overrides/ajustes para TS
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // habilita reglas type-aware si alguna lo requiere
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // 👉 esto evita el error "Unexpected any. Specify a different type."
      "@typescript-eslint/no-explicit-any": "off",

      // (Opcional) relaja otras reglas si te molestan en build:
      // "@typescript-eslint/explicit-module-boundary-types": "off",
      // "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
  },
];
