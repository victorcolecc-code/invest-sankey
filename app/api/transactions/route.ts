import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transactions, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const rows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      createdAt: transactions.createdAt,
      fromAccountId: transactions.fromAccountId,
      toAccountId: transactions.toAccountId,
      fromAccountName: accounts.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.fromAccountId, accounts.id))
    .orderBy(transactions.date)

  // Fetch to account names separately to avoid double join complexity
  const allAccounts = await db.select({ id: accounts.id, name: accounts.name }).from(accounts)
  const accountNameById = new Map(allAccounts.map((a) => [a.id, a.name]))

  const result = rows.map((r) => ({
    ...r,
    toAccountName: accountNameById.get(r.toAccountId) ?? "",
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { fromAccountId, toAccountId, amount, date, note } = body
  if (!fromAccountId || !toAccountId || !amount || !date) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
  }
  if (fromAccountId === toAccountId) {
    return NextResponse.json({ error: "来源和目标账户不能相同" }, { status: 400 })
  }
  const [row] = await db
    .insert(transactions)
    .values({ fromAccountId, toAccountId, amount: Number(amount), date, note: note || null })
    .returning()
  return NextResponse.json(row, { status: 201 })
}
