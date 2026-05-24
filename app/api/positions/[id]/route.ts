import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { positions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { accountId, name, initialAmount, currentValue, startDate } = body
  const [row] = await db
    .update(positions)
    .set({
      accountId,
      name: name?.trim(),
      initialAmount: Number(initialAmount),
      currentValue: Number(currentValue),
      startDate,
      updatedAt: Date.now(),
    })
    .where(eq(positions.id, parseInt(id)))
    .returning()
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(positions).where(eq(positions.id, parseInt(id)))
  return NextResponse.json({ ok: true })
}
