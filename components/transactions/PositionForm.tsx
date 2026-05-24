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
  accountId: z.number().int().positive("请选择账户"),
  name: z.string().min(1, "请填写持仓名称"),
  initialAmount: z.coerce.number().positive("买入金额必须大于 0"),
  currentValue: z.coerce.number().min(0, "当前市值不能为负"),
  startDate: z.string().min(1, "请选择买入日期"),
})

type FormValues = z.infer<typeof schema>

interface Account { id: number; name: string; type: string; color: string }
interface Position { id: number; accountId: number; name: string; initialAmount: number; currentValue: number; startDate: string }

interface Props {
  open: boolean
  onClose: () => void
  onSave: () => void
  accounts: Account[]
  onCreateAccount: (name: string) => Promise<Account>
  editing?: Position | null
}

export default function PositionForm({ open, onClose, onSave, accounts, onCreateAccount, editing }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { name: "", startDate: new Date().toISOString().slice(0, 10) },
  })

  useEffect(() => {
    if (editing) {
      form.reset({
        accountId: editing.accountId,
        name: editing.name,
        initialAmount: editing.initialAmount,
        currentValue: editing.currentValue,
        startDate: editing.startDate,
      })
    } else {
      form.reset({ name: "", startDate: new Date().toISOString().slice(0, 10) })
    }
  }, [editing, form])

  async function onSubmit(values: FormValues) {
    const url = editing ? `/api/positions/${editing.id}` : "/api/positions"
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
          <DialogTitle>{editing ? "编辑持仓" : "新增持仓"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属账户</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={accounts}
                      value={field.value ?? null}
                      onChange={field.onChange}
                      onCreateAccount={onCreateAccount}
                      placeholder="选择持有账户..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>持仓名称</FormLabel>
                  <FormControl>
                    <Input placeholder="如：广发中证500、沪深300ETF..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="initialAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>买入金额（元）</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>当前市值（元）</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="62000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>买入日期</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
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
