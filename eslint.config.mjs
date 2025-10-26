// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Permite usar configs legacy (next/core-web-vitals, next/typescript)
const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import("eslint").Linter.FlatConfig[]} */
const config = [
  // 1) Ignorar artefactos de build y archivos generados
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },

  // 2) Reglas base de Next (legacy) traídas a flat config
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 3) Ajustes para TypeScript
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Evita que el build falle por 'any'
      "@typescript-eslint/no-explicit-any": "off",

      // Evita que falle por disables ya no usados
      "eslint-comments/no-unused-disable": "off",

      // Warnings útiles (no rompen build)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
    },
  },
];

export default config;
