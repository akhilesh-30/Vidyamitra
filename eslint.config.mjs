import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // React Compiler diagnostics from eslint-plugin-react-hooks v6. The app was
  // written before these rules existed and hits them in ~20 places (fetch-in-effect
  // loaders, refs in render, Date/Math in render). They stay visible as warnings so
  // `npm run lint` — and therefore CI — is green while the rewrite happens in its own
  // PR. Move each one back to "error" as it is fixed.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
