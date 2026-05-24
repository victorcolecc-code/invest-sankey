import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("bank"), // bank | broker | fund | wallet | other
  color: text("color").notNull().default("#6366f1"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
})

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromAccountId: integer("from_account_id").notNull().references(() => accounts.id),
  toAccountId: integer("to_account_id").notNull().references(() => accounts.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  note: text("note"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
})

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  name: text("name").notNull(),
  initialAmount: real("initial_amount").notNull(),
  currentValue: real("current_value").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
})

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type Position = typeof positions.$inferSelect
export type NewPosition = typeof positions.$inferInsert
