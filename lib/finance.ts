const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000

export function annualizedReturn(
  currentValue: number,
  initialAmount: number,
  startDate: string
): number {
  if (initialAmount <= 0 || currentValue <= 0) return 0
  const years = (Date.now() - new Date(startDate).getTime()) / MS_PER_YEAR
  if (years <= 0) return 0
  return Math.pow(currentValue / initialAmount, 1 / years) - 1
}

export function formatPercent(rate: number): string {
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(2)}%`
}

export function formatCNY(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDateRange(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${years}年`)
  if (remMonths > 0) parts.push(`${remMonths}个月`)
  return parts.length > 0 ? parts.join("") : "不足1个月"
}
