import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"
import path from "path"

const DB_PATH = path.join(process.cwd(), "data", "invest.db")

// Module-level singleton safe under Next.js hot-reload
const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> }

function getDb() {
  if (!globalForDb._db) {
    const sqlite = new Database(DB_PATH)
    sqlite.pragma("journal_mode = WAL")
    sqlite.pragma("foreign_keys = ON")
    globalForDb._db = drizzle(sqlite, { schema })
  }
  return globalForDb._db
}

export const db = getDb()
