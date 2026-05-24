import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { accounts, transactions, positions } from "@/lib/db/schema"
import { buildSankeyData, type SankeyMode } from "@/lib/sankey-transform"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get("mode") ?? "flat") as SankeyMode
  const yearFrom = searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!) : undefined
  const yearTo = searchParams.get("yearTo") ? parseInt(searchParams.get("yearTo")!) : undefined

  const [allAccounts, allTransactions, allPositions] = await Promise.all([
    db.select().from(accounts),
    db.select().from(transactions).orderBy(transactions.date),
    db.select().from(positions),
  ])

  const data = buildSankeyData(allAccounts, allTransactions, allPositions, mode, yearFrom, yearTo)

  return NextResponse.json({ ...data, meta: { generatedAt: new Date().toISOString() } })
}
