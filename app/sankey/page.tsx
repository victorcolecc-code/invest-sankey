"use client"

import { useState } from "react"
import useSWR from "swr"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"

interface SankeyData {
  nodes: unknown[]
  links: unknown[]
  yearColumns: number[]
  yearLabelDepths: number[]
  totalDepths: number
}

const SankeyChart = dynamic(() => import("@/components/sankey/SankeyChart"), { ssr: false })

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 2015

// ECharts Sankey default margins as % of chart width
const SANKEY_LEFT_PCT = 5
const SANKEY_RIGHT_PCT = 21  // right margin for node labels

export default function SankeyPage() {
  const [mode, setMode] = useState<"flat" | "yearly">("yearly")
  const [yearFrom, setYearFrom] = useState(MIN_YEAR)
  const [yearTo, setYearTo] = useState(CURRENT_YEAR)

  const params = new URLSearchParams({ mode, yearFrom: String(yearFrom), yearTo: String(yearTo) })

  const { data, isLoading } = useSWR<SankeyData>(
    `/api/sankey?${params}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const years = Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)
  const yearColumns = data?.yearColumns ?? []
  const yearLabelDepths = data?.yearLabelDepths ?? []
  const totalDepths = data?.totalDepths ?? 1
  const showTimeAxis = mode === "yearly" && yearColumns.length > 0

  // Convert a depth index to % position within the sankey area (0–100 within the area)
  // then map to absolute % of chart width
  function depthToLeftPct(depth: number): number {
    const areaPct = totalDepths <= 1 ? 0 : (depth / (totalDepths - 1)) * 100
    return SANKEY_LEFT_PCT + (areaPct * (100 - SANKEY_LEFT_PCT - SANKEY_RIGHT_PCT)) / 100
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">年份</span>
          <select
            className="border border-input rounded-md px-2 py-1 text-sm bg-background"
            value={yearFrom}
            onChange={(e) => setYearFrom(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={y > yearTo}>{y}</option>
            ))}
          </select>
          <span className="text-muted-foreground">—</span>
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

        <div className="flex items-center gap-px border border-input rounded-md overflow-hidden">
          <Button
            variant={mode === "yearly" ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-7 px-3 text-xs"
            onClick={() => setMode("yearly")}
          >
            按年
          </Button>
          <Button
            variant={mode === "flat" ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-7 px-3 text-xs"
            onClick={() => setMode("flat")}
          >
            汇总
          </Button>
        </div>

        {isLoading && <span className="text-xs text-muted-foreground">加载中…</span>}

        {data && (
          <span className="text-xs text-muted-foreground ml-auto">
            {data.nodes.length} 个节点 · {data.links.length} 条流向
          </span>
        )}
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col px-6 pt-3 pb-6 min-h-0">
        {/* Time axis — each year label positioned at its account column */}
        {showTimeAxis && (
          <div className="relative h-6 shrink-0 mb-1">
            {yearColumns.map((year, i) => {
              const leftPct = depthToLeftPct(yearLabelDepths[i] ?? i * 2)
              return (
                <div
                  key={year}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
                >
                  <span className="text-xs font-semibold text-foreground/70 leading-none whitespace-nowrap">
                    {year}
                  </span>
                  <span className="w-px h-2 bg-border mt-0.5" />
                </div>
              )
            })}
          </div>
        )}

        {/* Sankey chart */}
        <div className="flex-1 min-h-[400px]">
          <SankeyChart data={data ?? null} />
        </div>
      </div>
    </div>
  )
}
