"use client"

import { useEffect, useRef } from "react"
import { tooltipFormatter } from "@/lib/client-tooltip"

interface SankeyData {
  nodes: unknown[]
  links: unknown[]
  yearColumns?: number[]
}

interface Props {
  data: SankeyData | null
}

export default function SankeyChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    async function init() {
      const echarts = await import("echarts")
      if (!containerRef.current) return

      if (!chartRef.current) {
        chartRef.current = echarts.init(containerRef.current, undefined, { renderer: "svg" })
      }

      const chart = chartRef.current

      if (!data || data.nodes.length === 0) {
        chart.setOption({
          series: [],
          graphic: [{
            type: "text",
            left: "center",
            top: "center",
            style: {
              text: "暂无数据，请先在「交易录入」页面添加账户和交易记录",
              fill: "#888",
              fontSize: 14,
            },
          }],
        }, true)
        return
      }

      chart.setOption({
        graphic: [],
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
          formatter: tooltipFormatter,
          enterable: false,
          confine: true,
        },
        series: [{
          type: "sankey",
          data: data.nodes,
          links: data.links,
          emphasis: { focus: "adjacency" },
          // nodeAlign: "left" is default and works with depth
          layoutIterations: 32,
          nodeWidth: 14,
          nodeGap: 10,
          // Strip " · YYYY" from displayed node labels
          label: {
            show: true,
            position: "right",
            fontSize: 12,
            color: "inherit",
            formatter: (params: { name: string }) => params.name.replace(/ · \d{4}$/, ""),
          },
          lineStyle: { color: "gradient", opacity: 0.45 },
          itemStyle: { borderRadius: 3 },
        }],
      }, true)
    }

    init()
  }, [data])

  useEffect(() => {
    const ro = new ResizeObserver(() => chartRef.current?.resize())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
