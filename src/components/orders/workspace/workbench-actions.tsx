"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { ordersWorkspaceApi, type WorkbenchItem } from "./orders-workspace-api"

const METHODS = [
  { id: "BANK_TRANSFER", label: "Chuyển khoản" },
  { id: "CASH", label: "Tiền mặt" },
  { id: "COD", label: "Ship thu hộ" },
  { id: "CARD", label: "Thẻ" },
  { id: "E_WALLET", label: "Ví điện tử" },
] as const

type Done = (message: string) => void
type Fail = (message: string) => void

function useRun(onDone: Done, onFail: Fail) {
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    try {
      onDone(await fn())
    } catch (e) {
      onFail(e instanceof Error ? e.message : "Không thực hiện được")
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

const inputCls = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-body-sm text-text sm:w-44"

/** Sale báo giá đơn chưa có giá (R15). */
export function QuoteAction({ item, onDone, onFail }: { item: WorkbenchItem; onDone: Done; onFail: Fail }) {
  const [value, setValue] = useState("")
  const { busy, run } = useRun(onDone, onFail)
  const amount = Number(value.replace(/\D/g, ""))
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        void run(async () => (await ordersWorkspaceApi.quote(item.id, amount), `Đã báo giá đơn ${item.code}`))
      }}
    >
      <Input aria-label={`Giá cho đơn ${item.code} (đồng)`} inputMode="numeric" placeholder="Giá (đồng)" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} />
      <Button type="submit" size="sm" variant="secondary" disabled={busy || amount <= 0}>Báo giá</Button>
    </form>
  )
}

/** Sale xin "giao trước, thu sau" — trong chính sách/hạn mức thì tự duyệt (R2). */
export function DeliverBeforePayAction({ item, onDone, onFail }: { item: WorkbenchItem; onDone: Done; onFail: Fail }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { busy, run } = useRun(onDone, onFail)
  if (!open) return <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Giao trước, thu sau</Button>
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        void run(async () => (await ordersWorkspaceApi.deliverBeforePay(item.id, reason.trim())).message)
      }}
    >
      <Input aria-label="Lý do giao trước, thu sau" placeholder="Lý do (vd. khách quen)" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
      <Button type="submit" size="sm" variant="secondary" disabled={busy || !reason.trim()}>Gửi</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Huỷ</Button>
    </form>
  )
}

/** Điều hành xác nhận tiền (R11) — lần đầu chuyển đơn sang Điều phối. */
export function ConfirmPaymentAction({ item, onDone, onFail }: { item: WorkbenchItem; onDone: Done; onFail: Fail }) {
  const [value, setValue] = useState(String(item.balanceVnd))
  const [method, setMethod] = useState<string>("BANK_TRANSFER")
  const { busy, run } = useRun(onDone, onFail)
  const amount = Number(value.replace(/\D/g, ""))
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        void run(async () => (await ordersWorkspaceApi.confirmPayment(item.id, amount, method), `Đã ghi nhận tiền đơn ${item.code}`))
      }}
    >
      <Input aria-label={`Số tiền đã nhận cho đơn ${item.code} (đồng)`} inputMode="numeric" value={value ? Number(value.replace(/\D/g, "")).toLocaleString("vi-VN") : ""} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} className={inputCls} />
      <NativeSelect aria-label="Cách thanh toán" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
        {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </NativeSelect>
      <Button type="submit" size="sm" className="shrink-0 whitespace-nowrap" disabled={busy || amount <= 0}>Xác nhận tiền</Button>
    </form>
  )
}
