// Pure client-safe tooltip formatter — no server-only imports

function formatCNY(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatPercent(rate: number): string {
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(2)}%`
}

function annualizedReturn(currentValue: number, initialAmount: number, startDate: string): number {
  if (initialAmount <= 0 || currentValue <= 0) return 0
  const years = (Date.now() - new Date(startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  if (years <= 0) return 0
  return Math.pow(currentValue / initialAmount, 1 / years) - 1
}

export function tooltipFormatter(params: { dataType: string; data: Record<string, unknown> }): string {
  const d = params.data
  const displayName = (d.name as string).replace(/ · \d{4}$/, "")

  if (params.dataType === "node") {
    const isPosition = d._accountType === "投资持仓"
    const invested = (d._totalInvested as number) ?? 0
    const current = (d._currentValue as number) ?? 0
    const startDate = d._startDate as string | null
    const rate = startDate && invested > 0 ? annualizedReturn(current, invested, startDate) : null

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
