import type { Account, Transaction, Position } from "./db/schema"
import { annualizedReturn, formatPercent, formatCNY, formatDateRange } from "./finance"

export type SankeyMode = "flat" | "yearly"

export interface SankeyNode {
  name: string
  depth?: number          // ECharts column index — enforces time-axis ordering
  itemStyle?: { color: string }
  // tooltip fields (passed through by ECharts to formatter)
  _accountId: number
  _accountType: string
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
  yearColumns: number[]   // sorted years present in data; empty in flat mode
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "银行账户",
  broker: "券商账户",
  fund: "基金账户",
  wallet: "电子钱包",
  other: "其他账户",
}

function nodeName(account: Account, year?: number): string {
  return year != null ? `${account.name} · ${year}` : account.name
}

export function buildSankeyData(
  accounts: Account[],
  transactions: Transaction[],
  positions: Position[],
  mode: SankeyMode,
  yearFrom?: number,
  yearTo?: number
): SankeyData {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Filter transactions by year range
  const filtered = transactions.filter((t) => {
    const year = parseInt(t.date.slice(0, 4), 10)
    if (yearFrom && year < yearFrom) return false
    if (yearTo && year > yearTo) return false
    return true
  })

  // Build year → depth mapping (0-indexed by sorted year)
  const yearsSet = new Set<number>()
  for (const t of filtered) yearsSet.add(parseInt(t.date.slice(0, 4), 10))
  const yearColumns = Array.from(yearsSet).sort()
  const yearToDepth = new Map(yearColumns.map((y, i) => [y, i]))

  // Group positions by accountId
  const positionsByAccount = new Map<number, Position[]>()
  for (const p of positions) {
    const list = positionsByAccount.get(p.accountId) ?? []
    list.push(p)
    positionsByAccount.set(p.accountId, list)
  }

  // Collect node keys: "accountId:year" in yearly mode, "accountId:" in flat mode
  const nodeKeys = new Set<string>()
  for (const t of filtered) {
    const from = accountMap.get(t.fromAccountId)
    const to = accountMap.get(t.toAccountId)
    if (!from || !to) continue
    const year = mode === "yearly" ? parseInt(t.date.slice(0, 4), 10) : undefined
    nodeKeys.add(`${t.fromAccountId}:${year ?? ""}`)
    nodeKeys.add(`${t.toAccountId}:${year ?? ""}`)
  }

  // Build nodes
  const nodeByKey = new Map<string, SankeyNode>()
  for (const key of nodeKeys) {
    const [idStr, yearStr] = key.split(":")
    const accountId = parseInt(idStr, 10)
    const year = yearStr ? parseInt(yearStr, 10) : undefined
    const account = accountMap.get(accountId)
    if (!account) continue

    const acctPositions = positionsByAccount.get(accountId) ?? []
    const totalInitial = acctPositions.reduce((s, p) => s + p.initialAmount, 0)
    const totalCurrent = acctPositions.reduce((s, p) => s + p.currentValue, 0)
    const earliestStart = acctPositions.length > 0
      ? acctPositions.reduce((min, p) => p.startDate < min ? p.startDate : min, acctPositions[0].startDate)
      : null
    const annReturn = earliestStart && totalInitial > 0
      ? annualizedReturn(totalCurrent, totalInitial, earliestStart)
      : null

    const depth = (mode === "yearly" && year != null) ? yearToDepth.get(year) : undefined

    nodeByKey.set(key, {
      name: nodeName(account, year),
      depth,
      itemStyle: { color: account.color },
      _accountId: accountId,
      _accountType: ACCOUNT_TYPE_LABELS[account.type] ?? account.type,
      _totalInvested: totalInitial,
      _currentValue: totalCurrent,
      _startDate: earliestStart,
      _holdingDuration: earliestStart ? formatDateRange(earliestStart) : null,
      _annualizedReturn: annReturn,
      _positions: acctPositions.map((p) => ({
        name: p.name,
        initialAmount: p.initialAmount,
        currentValue: p.currentValue,
        startDate: p.startDate,
      })),
    })
  }

  // Build links — aggregate same source+target pairs
  const linkMap = new Map<string, { total: number; dates: string[]; notes: string[] }>()
  for (const t of filtered) {
    const from = accountMap.get(t.fromAccountId)
    const to = accountMap.get(t.toAccountId)
    if (!from || !to) continue
    const year = mode === "yearly" ? parseInt(t.date.slice(0, 4), 10) : undefined
    const srcName = nodeName(from, year)
    const tgtName = nodeName(to, year)
    const linkKey = `${srcName}→${tgtName}`
    const existing = linkMap.get(linkKey) ?? { total: 0, dates: [], notes: [] }
    existing.total += t.amount
    existing.dates.push(t.date)
    if (t.note) existing.notes.push(t.note)
    linkMap.set(linkKey, existing)
  }

  const links: SankeyLink[] = []
  for (const [key, { total, dates, notes }] of linkMap.entries()) {
    const [source, target] = key.split("→")
    dates.sort()
    links.push({
      source,
      target,
      value: total,
      _date: dates.length === 1 ? dates[0] : `${dates[0]} ~ ${dates[dates.length - 1]}`,
      _note: notes.length > 0 ? notes.join("、") : null,
      _transactionCount: dates.length,
    })
  }

  return {
    nodes: Array.from(nodeByKey.values()),
    links,
    yearColumns: mode === "yearly" ? yearColumns : [],
  }
}

export function tooltipHtml(params: {
  dataType: string
  data: Record<string, unknown>
}): string {
  const d = params.data

  if (params.dataType === "node") {
    const node = d as unknown as SankeyNode
    const invested = node._totalInvested
    const current = node._currentValue
    const rate = node._annualizedReturn
    // Strip " · YYYY" suffix for cleaner tooltip title
    const displayName = (node.name as string).replace(/ · \d{4}$/, "")

    let html = `<div class="sankey-tooltip">
      <strong>${displayName}</strong>
      <div class="row"><span>账户类型</span><span>${node._accountType}</span></div>`

    if (node._positions.length > 0) {
      html += `<div class="row"><span>持仓数量</span><span>${node._positions.length} 个</span></div>`
      if (invested > 0) {
        html += `<div class="row"><span>累计投入</span><span>${formatCNY(invested)}</span></div>`
        html += `<div class="row"><span>当前市值</span><span>${formatCNY(current)}</span></div>`
      }
      if (node._holdingDuration) {
        html += `<div class="row"><span>持有时长</span><span>${node._holdingDuration}</span></div>`
      }
      if (rate !== null) {
        const cls = rate >= 0 ? "positive" : "negative"
        html += `<div class="row"><span>年化收益</span><span class="${cls}">${formatPercent(rate)}</span></div>`
      }
    }
    html += `</div>`
    return html
  }

  const link = d as unknown as SankeyLink
  const srcDisplay = (link.source as string).replace(/ · \d{4}$/, "")
  const tgtDisplay = (link.target as string).replace(/ · \d{4}$/, "")
  return `<div class="sankey-tooltip">
    <strong>${srcDisplay} → ${tgtDisplay}</strong>
    <div class="row"><span>金额</span><span>${formatCNY(link.value as number)}</span></div>
    <div class="row"><span>时间</span><span>${link._date}</span></div>
    ${(link._transactionCount as number) > 1 ? `<div class="row"><span>笔数</span><span>${link._transactionCount as number} 笔</span></div>` : ""}
    ${link._note ? `<div class="row"><span>备注</span><span>${link._note as string}</span></div>` : ""}
  </div>`
}
