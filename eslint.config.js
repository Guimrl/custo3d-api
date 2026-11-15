import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".vercel"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      indent: ["error", 2, { SwitchCase: 1 }],
      "linebreak-style": ["error", "windows"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      curly: ["error", "all"],
      "id-length": ["error", { min: 2, exceptions: ["_"], properties: "never" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
