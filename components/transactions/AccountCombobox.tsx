"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface Account { id: number; name: string; type: string; color: string }

interface Props {
  accounts: Account[]
  value: number | null
  onChange: (id: number) => void
  onCreateAccount?: (name: string) => Promise<Account>
  placeholder?: string
}

const ACCOUNT_TYPES = [
  { value: "bank", label: "银行账户" },
  { value: "broker", label: "券商账户" },
  { value: "fund", label: "基金账户" },
  { value: "wallet", label: "电子钱包" },
  { value: "other", label: "其他" },
]

const ACCOUNT_COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]

export default function AccountCombobox({ accounts, value, onChange, onCreateAccount, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [newType, setNewType] = useState("bank")
  const [newColor, setNewColor] = useState(ACCOUNT_COLORS[0])

  const selected = accounts.find((a) => a.id === value)
  const filtered = accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
  const showCreate = onCreateAccount && search.trim() && !accounts.some((a) => a.name === search.trim())

  async function handleCreate() {
    if (!onCreateAccount || !search.trim()) return
    setCreating(true)
    try {
      const account = await onCreateAccount(search.trim())
      onChange(account.id)
      setOpen(false)
      setSearch("")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: selected.color }} />
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder ?? "选择账户..."}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索或新建账户..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {showCreate ? (
                <div className="p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">新建账户：<strong>{search}</strong></p>
                  <div className="flex gap-2 flex-wrap">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setNewType(t.value)}
                        className={cn(
                          "text-xs px-2 py-1 rounded border",
                          newType === t.value ? "bg-primary text-primary-foreground border-primary" : "border-input"
                        )}
                      >{t.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {ACCOUNT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={cn("w-5 h-5 rounded-full border-2", newColor === c ? "border-foreground" : "border-transparent")}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <Button size="sm" className="w-full" onClick={handleCreate} disabled={creating}>
                    <Plus className="w-3 h-3 mr-1" />
                    {creating ? "创建中..." : "创建账户"}
                  </Button>
                </div>
              ) : "没有找到账户"}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((a) => (
                <CommandItem
                  key={a.id}
                  value={String(a.id)}
                  onSelect={() => { onChange(a.id); setOpen(false); setSearch("") }}
                >
                  <span className="w-3 h-3 rounded-full shrink-0 mr-2" style={{ background: a.color }} />
                  {a.name}
                  <Check className={cn("ml-auto h-4 w-4", value === a.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
              {showCreate && filtered.length > 0 && (
                <CommandItem
                  value="__create__"
                  onSelect={handleCreate}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新建 "{search}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
