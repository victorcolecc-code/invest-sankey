"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import TransactionForm from "@/components/transactions/TransactionForm"
import PositionForm from "@/components/transactions/PositionForm"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Account { id: number; name: string; type: string; color: string }
interface TransactionRow {
  id: number; fromAccountId: number; toAccountId: number
  fromAccountName: string; toAccountName: string
  amount: number; date: string; note?: string | null
}
interface PositionRow {
  id: number; accountId: number; accountName: string
  name: string; initialAmount: number; currentValue: number; startDate: string
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "银行", broker: "券商", fund: "基金", wallet: "钱包", other: "其他",
}

function pnlColor(initial: number, current: number) {
  const diff = current - initial
  if (diff > 0) return "text-green-600"
  if (diff < 0) return "text-red-500"
  return ""
}

function annReturn(current: number, initial: number, startDate: string): string {
  if (initial <= 0 || current <= 0) return "-"
  const years = (Date.now() - new Date(startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  if (years <= 0) return "-"
  const r = Math.pow(current / initial, 1 / years) - 1
  const sign = r >= 0 ? "+" : ""
  return `${sign}${(r * 100).toFixed(2)}%`
}

export default function TransactionsPage() {
  const { data: accounts = [], mutate: mutateAccounts } = useSWR<Account[]>("/api/accounts", fetcher)
  const { data: txList = [], mutate: mutateTx } = useSWR<TransactionRow[]>("/api/transactions", fetcher)
  const { data: posList = [], mutate: mutatePos } = useSWR<PositionRow[]>("/api/positions", fetcher)

  const [txFormOpen, setTxFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRow | null>(null)
  const [posFormOpen, setPosFormOpen] = useState(false)
  const [editingPos, setEditingPos] = useState<PositionRow | null>(null)

  async function createAccount(name: string): Promise<Account> {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const account = await res.json()
    await mutateAccounts()
    return account
  }

  async function deleteTransaction(id: number) {
    if (!confirm("确认删除这条交易记录？")) return
    await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    mutateTx()
  }

  async function deletePosition(id: number) {
    if (!confirm("确认删除这条持仓记录？")) return
    await fetch(`/api/positions/${id}`, { method: "DELETE" })
    mutatePos()
  }

  return (
    <div className="p-6 space-y-8">
      {/* Account summary */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <Badge key={a.id} variant="secondary" className="gap-1.5 py-1 px-2.5">
              <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
              {a.name}
              <span className="text-muted-foreground text-xs">{ACCOUNT_TYPE_LABELS[a.type]}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">交易记录</h2>
          <Button size="sm" onClick={() => { setEditingTx(null); setTxFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新增交易
          </Button>
        </div>
        {txList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">暂无交易记录</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>来源账户</TableHead>
                  <TableHead>目标账户</TableHead>
                  <TableHead className="text-right">金额（元）</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txList.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{tx.date}</TableCell>
                    <TableCell className="text-sm">{tx.fromAccountName}</TableCell>
                    <TableCell className="text-sm">{tx.toAccountName}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {tx.amount.toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.note}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => { setEditingTx(tx); setTxFormOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => deleteTransaction(tx.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Positions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">持仓记录</h2>
          <Button size="sm" onClick={() => { setEditingPos(null); setPosFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新增持仓
          </Button>
        </div>
        {posList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">暂无持仓记录</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>持仓名称</TableHead>
                  <TableHead>所属账户</TableHead>
                  <TableHead className="text-right">买入金额</TableHead>
                  <TableHead className="text-right">当前市值</TableHead>
                  <TableHead className="text-right">年化收益</TableHead>
                  <TableHead>买入日期</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posList.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="text-sm font-medium">{pos.name}</TableCell>
                    <TableCell className="text-sm">{pos.accountName}</TableCell>
                    <TableCell className="text-right text-sm">
                      {pos.initialAmount.toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${pnlColor(pos.initialAmount, pos.currentValue)}`}>
                      {pos.currentValue.toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${pnlColor(pos.initialAmount, pos.currentValue)}`}>
                      {annReturn(pos.currentValue, pos.initialAmount, pos.startDate)}
                    </TableCell>
                    <TableCell className="text-sm">{pos.startDate}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => { setEditingPos(pos); setPosFormOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => deletePosition(pos.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <TransactionForm
        open={txFormOpen}
        onClose={() => setTxFormOpen(false)}
        onSave={() => { mutateTx(); mutateAccounts() }}
        accounts={accounts}
        onCreateAccount={createAccount}
        editing={editingTx}
      />
      <PositionForm
        open={posFormOpen}
        onClose={() => setPosFormOpen(false)}
        onSave={() => { mutatePos(); mutateAccounts() }}
        accounts={accounts}
        onCreateAccount={createAccount}
        editing={editingPos}
      />
    </div>
  )
}
