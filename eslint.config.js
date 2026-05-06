import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Modularidade: outros módulos só podem importar a API pública (barrel index.ts),
      // nunca caminhos profundos como @/modules/<x>/components/... ou /pages/...
      // Exceções: services/, hooks/, data/ continuam acessíveis para retrocompatibilidade.
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/modules/*/components/*", "@/modules/*/pages/*"],
              message:
                "Não importe diretamente components/ ou pages/ de outro módulo. Use o barrel @/modules/<modulo> (index.ts) e exponha lá o que precisa ser público.",
            },
          ],
        },
      ],
    },
  },
);
