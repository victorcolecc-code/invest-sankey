import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { accounts, positions } from "@/lib/db/schema"
import { buildSankeyData, type SankeyMode } from "@/lib/sankey-transform"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get("mode") ?? "yearly") as SankeyMode
  const yearFrom = searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!) : undefined
  const yearTo = searchParams.get("yearTo") ? parseInt(searchParams.get("yearTo")!) : undefined

  const [allAccounts, allPositions] = await Promise.all([
    db.select().from(accounts),
    db.select().from(positions),
  ])

  const data = buildSankeyData(allAccounts, allPositions, mode, yearFrom, yearTo)

  return NextResponse.json(data)
}
