import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/singlestore"
// ← import your typed env helper
import { env } from "./src/env"

const pool = mysql.createPool({
  host:     env.SINGLESTORE_HOST,
  port:     Number(env.SINGLESTORE_PORT),
  user:     env.SINGLESTORE_USER,
  password: env.SINGLESTORE_PASS,
  database: env.SINGLESTORE_DB_NAME,
  ssl:      {},    // or your CA bundle settings
})

export const db = drizzle({ client: pool })