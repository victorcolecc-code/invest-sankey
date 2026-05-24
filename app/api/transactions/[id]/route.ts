import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transactions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { fromAccountId, toAccountId, amount, date, note } = body
  const [row] = await db
    .update(transactions)
    .set({ fromAccountId, toAccountId, amount: Number(amount), date, note: note || null })
    .where(eq(transactions.id, parseInt(id)))
    .returning()
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(transactions).where(eq(transactions.id, parseInt(id)))
  return NextResponse.json({ ok: true })
}
