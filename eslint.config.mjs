import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // This deployment holds the Supabase service-role key, so it can read every
    // merchant's data. Confining all database access to one auditable file is
    // the main thing standing between an SSRF here and a full data breach.
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["lib/queries.ts", "lib/db.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "Only lib/queries.ts may import the database client. Add a query function there instead.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
