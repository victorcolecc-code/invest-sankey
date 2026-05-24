"use client"

import { useState } from "react"
import useSWR from "swr"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
interface SankeyData { nodes: unknown[]; links: unknown[] }

const SankeyChart = dynamic(() => import("@/components/sankey/SankeyChart"), { ssr: false })

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 2015

export default function SankeyPage() {
  const [mode, setMode] = useState<"flat" | "yearly">("flat")
  const [yearFrom, setYearFrom] = useState(MIN_YEAR)
  const [yearTo, setYearTo] = useState(CURRENT_YEAR)

  const params = new URLSearchParams({
    mode,
    yearFrom: String(yearFrom),
    yearTo: String(yearTo),
  })

  const { data, isLoading } = useSWR<SankeyData & { meta: { generatedAt: string } }>(
    `/api/sankey?${params}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const years = Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">起始年份</span>
          <select
            className="border border-input rounded-md px-2 py-1 text-sm bg-background"
            value={yearFrom}
            onChange={(e) => setYearFrom(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={y > yearTo}>{y}</option>
            ))}
          </select>
          <span className="text-muted-foreground">至</span>
          <select
            className="border border-input rounded-md px-2 py-1 text-sm bg-background"
            value={yearTo}
            onChange={(e) => setYearTo(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={y < yearFrom}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 border border-input rounded-md overflow-hidden">
          <Button
            variant={mode === "flat" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setMode("flat")}
          >
            合并视图
          </Button>
          <Button
            variant={mode === "yearly" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setMode("yearly")}
          >
            按年视图
          </Button>
        </div>

        {isLoading && (
          <span className="text-sm text-muted-foreground">加载中...</span>
        )}

        {data?.nodes && (
          <span className="text-xs text-muted-foreground ml-auto">
            {data.nodes.length} 个节点 · {data.links.length} 条流向
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 p-6">
        <SankeyChart data={data ?? null} />
      </div>
    </div>
  )
}
