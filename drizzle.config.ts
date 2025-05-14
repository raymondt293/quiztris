import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  // ── where to write SQL migration files ──────────────────────────
  out:          "./drizzle/migrations",

  // ── point at TypeScript schema definitions ─────────────────
  schema:       "./src/server/db/schema.ts",

  // ── SingleStore dialect ─────────────────────────────────────────
  dialect:      "singlestore",

  // ── only manage tables matching this glob ───────────────────────
  tablesFilter: ["quiztris_*"],

  // ──  DB connection (loaded from env) ────────────────────────
  dbCredentials: {
    host:     env.SINGLESTORE_HOST,
    port:     Number(env.SINGLESTORE_PORT),
    user:     env.SINGLESTORE_USER,
    password: env.SINGLESTORE_PASS,
    database: env.SINGLESTORE_DB_NAME,
    ssl:      {},   
  },
} satisfies Config