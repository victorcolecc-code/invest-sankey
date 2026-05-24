import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const rows = await db.select().from(accounts).orderBy(accounts.name)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, type = "bank", color = "#6366f1" } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: "账户名称不能为空" }, { status: 400 })
  }
  const [row] = await db.insert(accounts).values({ name: name.trim(), type, color }).returning()
  return NextResponse.json(row, { status: 201 })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get("id") ?? "")
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 })
  await db.delete(accounts).where(eq(accounts.id, id))
  return NextResponse.json({ ok: true })
}
