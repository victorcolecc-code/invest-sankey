import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { positions, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const rows = await db
    .select({
      id: positions.id,
      name: positions.name,
      initialAmount: positions.initialAmount,
      currentValue: positions.currentValue,
      startDate: positions.startDate,
      updatedAt: positions.updatedAt,
      accountId: positions.accountId,
      accountName: accounts.name,
    })
    .from(positions)
    .leftJoin(accounts, eq(positions.accountId, accounts.id))
    .orderBy(positions.startDate)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { accountId, name, initialAmount, currentValue, startDate } = body
  if (!accountId || !name || !initialAmount || !startDate) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
  }
  const [row] = await db
    .insert(positions)
    .values({
      accountId,
      name: name.trim(),
      initialAmount: Number(initialAmount),
      currentValue: Number(currentValue ?? initialAmount),
      startDate,
    })
    .returning()
  return NextResponse.json(row, { status: 201 })
}
