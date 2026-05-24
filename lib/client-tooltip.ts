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

  if (params.dataType === "node") {
    const invested = (d._totalInvested as number) ?? 0
    const current = (d._currentValue as number) ?? 0
    const startDate = d._startDate as string | null
    const rate = startDate && invested > 0 ? annualizedReturn(current, invested, startDate) : null

    let html = `<div class="sankey-tooltip">
      <strong>${d.name as string}</strong>
      <div class="row"><span>账户类型</span><span>${d._accountType as string}</span></div>`

    const posCount = (d._positions as unknown[])?.length ?? 0
    if (posCount > 0) {
      html += `<div class="row"><span>持仓数量</span><span>${posCount} 个</span></div>`
      if (invested > 0) {
        html += `<div class="row"><span>累计投入</span><span>${formatCNY(invested)}</span></div>`
        html += `<div class="row"><span>当前市值</span><span>${formatCNY(current)}</span></div>`
      }
      if (d._holdingDuration) {
        html += `<div class="row"><span>持有时长</span><span>${d._holdingDuration as string}</span></div>`
      }
      if (rate !== null) {
        const cls = rate >= 0 ? "positive" : "negative"
        html += `<div class="row"><span>年化收益</span><span class="${cls}">${formatPercent(rate)}</span></div>`
      }
    }

    html += `</div>`
    return html
  }

  // link
  return `<div class="sankey-tooltip">
    <strong>${d.source as string} → ${d.target as string}</strong>
    <div class="row"><span>转入金额</span><span>${formatCNY(d.value as number)}</span></div>
    <div class="row"><span>时间</span><span>${d._date as string}</span></div>
    ${(d._transactionCount as number) > 1 ? `<div class="row"><span>笔数</span><span>${d._transactionCount as number} 笔</span></div>` : ""}
    ${d._note ? `<div class="row"><span>备注</span><span>${d._note as string}</span></div>` : ""}
  </div>`
}
