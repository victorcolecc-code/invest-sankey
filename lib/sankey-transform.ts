import type { Account, Position } from "./db/schema"
import { annualizedReturn, formatPercent, formatCNY, formatDateRange } from "./finance"

export type SankeyMode = "flat" | "yearly"

export interface SankeyNode {
  name: string
  depth?: number
  itemStyle?: { color: string }
  // tooltip fields
  _accountId: number
  _accountType: string          // "投资持仓" for position nodes, account type for account nodes
  _totalInvested: number
  _currentValue: number
  _startDate: string | null
  _holdingDuration: string | null
  _annualizedReturn: number | null
  _positions: Array<{ name: string; initialAmount: number; currentValue: number; startDate: string }>
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  _date: string
  _note: string | null
  _transactionCount: number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
  yearColumns: number[]      // sorted years present in data
  yearLabelDepths: number[]  // depth index for each year's label column
  totalDepths: number        // total number of depth columns
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "银行账户",
  broker: "券商账户",
  fund: "基金账户",
  wallet: "电子钱包",
  other: "其他账户",
}

// Blend hex color with white at ratio 0-1 (0 = original, 1 = white)
function lightenHex(hex: string, ratio = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * ratio)
  const lg = Math.round(g + (255 - g) * ratio)
  const lb = Math.round(b + (255 - b) * ratio)
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`
}

/**
 * Build Sankey from investment positions.
 * Layout: account node (even depth) → investment node (odd depth)
 * Yearly mode: year Y → account at depth 2*yearIdx, investment at depth 2*yearIdx+1
 * Flat mode:   account at depth 0, investment at depth 1
 */
export function buildSankeyData(
  accounts: Account[],
  positions: Position[],
  mode: SankeyMode,
  yearFrom?: number,
  yearTo?: number
): SankeyData {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Filter by year range using position startDate
  const filtered = positions.filter((p) => {
    const year = parseInt(p.startDate.slice(0, 4), 10)
    if (yearFrom && year < yearFrom) return false
    if (yearTo && year > yearTo) return false
    return true
  })

  // Sorted unique years present in filtered positions
  const yearsSet = new Set<number>()
  for (const p of filtered) yearsSet.add(parseInt(p.startDate.slice(0, 4), 10))
  const yearColumns = Array.from(yearsSet).sort()
  const yearToIdx = new Map(yearColumns.map((y, i) => [y, i]))

  // Depth layout:
  //   yearly:  account = yearIdx*2,  investment = yearIdx*2+1
  //   flat:    account = 0,          investment = 1
  const totalDepths = mode === "yearly" && yearColumns.length > 0
    ? yearColumns.length * 2
    : 2
  const yearLabelDepths = yearColumns.map((_, i) => mode === "yearly" ? i * 2 : 0)

  const nodeByKey = new Map<string, SankeyNode>()
  const linkMap = new Map<string, { total: number; dates: string[] }>()

  for (const pos of filtered) {
    const account = accountMap.get(pos.accountId)
    if (!account) continue
    const year = parseInt(pos.startDate.slice(0, 4), 10)
    const yearIdx = mode === "yearly" ? (yearToIdx.get(year) ?? 0) : 0

    // ── Account (source) node ──────────────────────────────────────
    const acctKey = mode === "yearly" ? `acct:${pos.accountId}:${year}` : `acct:${pos.accountId}`
    const acctDisplayName = mode === "yearly" ? `${account.name} · ${year}` : account.name

    if (!nodeByKey.has(acctKey)) {
      // Aggregate all positions under this account for this year (or all years in flat mode)
      const relPos = filtered.filter((p) => {
        if (p.accountId !== pos.accountId) return false
        if (mode === "yearly") return parseInt(p.startDate.slice(0, 4), 10) === year
        return true
      })
      const totalInit = relPos.reduce((s, p) => s + p.initialAmount, 0)
      const totalCurr = relPos.reduce((s, p) => s + p.currentValue, 0)
      const earliest = relPos.reduce(
        (min, p) => (p.startDate < min ? p.startDate : min),
        relPos[0].startDate
      )
      nodeByKey.set(acctKey, {
        name: acctDisplayName,
        depth: yearIdx * 2,
        itemStyle: { color: account.color },
        _accountId: account.id,
        _accountType: ACCOUNT_TYPE_LABELS[account.type] ?? account.type,
        _totalInvested: totalInit,
        _currentValue: totalCurr,
        _startDate: earliest,
        _holdingDuration: formatDateRange(earliest),
        _annualizedReturn: totalInit > 0 ? annualizedReturn(totalCurr, totalInit, earliest) : null,
        _positions: relPos.map((p) => ({
          name: p.name,
          initialAmount: p.initialAmount,
          currentValue: p.currentValue,
          startDate: p.startDate,
        })),
      })
    }

    // ── Investment (target) node ───────────────────────────────────
    // Key includes accountId so same-named fund under different accounts stays separate
    const posKey = mode === "yearly"
      ? `pos:${pos.name}:${pos.accountId}:${year}`
      : `pos:${pos.name}:${pos.accountId}`
    const posDisplayName = mode === "yearly" ? `${pos.name} · ${year}` : pos.name

    if (!nodeByKey.has(posKey)) {
      nodeByKey.set(posKey, {
        name: posDisplayName,
        depth: yearIdx * 2 + 1,
        itemStyle: { color: lightenHex(account.color) },
        _accountId: account.id,
        _accountType: "投资持仓",
        _totalInvested: pos.initialAmount,
        _currentValue: pos.currentValue,
        _startDate: pos.startDate,
        _holdingDuration: formatDateRange(pos.startDate),
        _annualizedReturn:
          pos.initialAmount > 0
            ? annualizedReturn(pos.currentValue, pos.initialAmount, pos.startDate)
            : null,
        _positions: [
          {
            name: pos.name,
            initialAmount: pos.initialAmount,
            currentValue: pos.currentValue,
            startDate: pos.startDate,
          },
        ],
      })
    } else {
      // Aggregate if same position name / account / year appears multiple times
      const node = nodeByKey.get(posKey)!
      node._totalInvested += pos.initialAmount
      node._currentValue += pos.currentValue
      node._positions.push({
        name: pos.name,
        initialAmount: pos.initialAmount,
        currentValue: pos.currentValue,
        startDate: pos.startDate,
      })
      node._annualizedReturn =
        node._totalInvested > 0
          ? annualizedReturn(node._currentValue, node._totalInvested, node._startDate ?? pos.startDate)
          : null
    }

    // ── Link: account → investment ─────────────────────────────────
    const linkKey = `${acctDisplayName}→${posDisplayName}`
    const existing = linkMap.get(linkKey) ?? { total: 0, dates: [] }
    existing.total += pos.initialAmount
    existing.dates.push(pos.startDate)
    linkMap.set(linkKey, existing)
  }

  const links: SankeyLink[] = []
  for (const [key, { total, dates }] of linkMap.entries()) {
    const [source, target] = key.split("→")
    dates.sort()
    links.push({
      source,
      target,
      value: total,
      _date: dates.length === 1 ? dates[0] : `${dates[0]} ~ ${dates[dates.length - 1]}`,
      _note: null,
      _transactionCount: dates.length,
    })
  }

  return {
    nodes: Array.from(nodeByKey.values()),
    links,
    yearColumns: mode === "yearly" ? yearColumns : [],
    yearLabelDepths: mode === "yearly" ? yearLabelDepths : [],
    totalDepths,
  }
}

export function tooltipHtml(params: {
  dataType: string
  data: Record<string, unknown>
}): string {
  const d = params.data
  const displayName = (d.name as string).replace(/ · \d{4}$/, "")

  if (params.dataType === "node") {
    const isPosition = d._accountType === "投资持仓"
    const invested = d._totalInvested as number
    const current = d._currentValue as number
    const rate = d._annualizedReturn as number | null

    if (isPosition) {
      const gain = current - invested
      const gainSign = gain >= 0 ? "+" : ""
      let html = `<div class="sankey-tooltip">
        <strong>${displayName}</strong>
        <div class="row"><span>买入金额</span><span>${formatCNY(invested)}</span></div>
        <div class="row"><span>当前市值</span><span>${formatCNY(current)}</span></div>
        <div class="row"><span>盈亏</span><span class="${gain >= 0 ? "positive" : "negative"}">${gainSign}${formatCNY(gain)}</span></div>`
      if (d._holdingDuration) {
        html += `<div class="row"><span>持有时长</span><span>${d._holdingDuration as string}</span></div>`
      }
      if (rate !== null) {
        html += `<div class="row"><span>年化收益</span><span class="${rate >= 0 ? "positive" : "negative"}">${formatPercent(rate)}</span></div>`
      }
      html += `</div>`
      return html
    }

    // Account node
    const posCount = (d._positions as unknown[])?.length ?? 0
    let html = `<div class="sankey-tooltip">
      <strong>${displayName}</strong>
      <div class="row"><span>账户类型</span><span>${d._accountType as string}</span></div>
      <div class="row"><span>持仓数量</span><span>${posCount} 个</span></div>`
    if (invested > 0) {
      html += `<div class="row"><span>累计投入</span><span>${formatCNY(invested)}</span></div>`
      html += `<div class="row"><span>当前市值</span><span>${formatCNY(current)}</span></div>`
    }
    if (d._holdingDuration) {
      html += `<div class="row"><span>最早持有</span><span>${d._holdingDuration as string}</span></div>`
    }
    if (rate !== null) {
      html += `<div class="row"><span>年化收益</span><span class="${rate >= 0 ? "positive" : "negative"}">${formatPercent(rate)}</span></div>`
    }
    html += `</div>`
    return html
  }

  // Link tooltip
  const srcDisplay = (d.source as string).replace(/ · \d{4}$/, "")
  const tgtDisplay = (d.target as string).replace(/ · \d{4}$/, "")
  return `<div class="sankey-tooltip">
    <strong>${srcDisplay} → ${tgtDisplay}</strong>
    <div class="row"><span>投入金额</span><span>${formatCNY(d.value as number)}</span></div>
    <div class="row"><span>买入日期</span><span>${d._date as string}</span></div>
    ${(d._transactionCount as number) > 1 ? `<div class="row"><span>笔数</span><span>${d._transactionCount as number} 笔</span></div>` : ""}
  </div>`
}
