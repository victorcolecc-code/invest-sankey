"use client"

import { useEffect } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import AccountCombobox from "./AccountCombobox"

const schema = z.object({
  fromAccountId: z.number().int().positive("请选择来源账户"),
  toAccountId: z.number().int().positive("请选择目标账户"),
  amount: z.coerce.number().positive("金额必须大于 0"),
  date: z.string().min(1, "请选择日期"),
  note: z.string().optional(),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: "来源和目标账户不能相同",
  path: ["toAccountId"],
})

type FormValues = z.infer<typeof schema>

interface Account { id: number; name: string; type: string; color: string }
interface Transaction { id: number; fromAccountId: number; toAccountId: number; amount: number; date: string; note?: string | null }

interface Props {
  open: boolean
  onClose: () => void
  onSave: () => void
  accounts: Account[]
  onCreateAccount: (name: string) => Promise<Account>
  editing?: Transaction | null
}

export default function TransactionForm({ open, onClose, onSave, accounts, onCreateAccount, editing }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { date: new Date().toISOString().slice(0, 10), note: "" },
  })

  useEffect(() => {
    if (editing) {
      form.reset({
        fromAccountId: editing.fromAccountId,
        toAccountId: editing.toAccountId,
        amount: editing.amount,
        date: editing.date,
        note: editing.note ?? "",
      })
    } else {
      form.reset({ date: new Date().toISOString().slice(0, 10), note: "" })
    }
  }, [editing, form])

  async function onSubmit(values: FormValues) {
    const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      onSave()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑交易" : "新增交易"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>来源账户</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={accounts}
                      value={field.value ?? null}
                      onChange={field.onChange}
                      onCreateAccount={onCreateAccount}
                      placeholder="选择资金来源..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>目标账户</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={accounts}
                      value={field.value ?? null}
                      onChange={field.onChange}
                      onCreateAccount={onCreateAccount}
                      placeholder="选择资金去向..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>金额（元）</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="10000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="如：定投、年终奖..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
