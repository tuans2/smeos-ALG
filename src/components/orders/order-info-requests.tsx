"use client"

import { useEffect, useState } from "react"

import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"

interface InfoRequest {
  id: string
  label: string
  reason: string
  requestedFrom: string
  dueAt: string | null
  status: string
  responseValue: string | null
  cancelledReason: string | null
}

const STATUS_TEXT: Record<string, string> = {
  OPEN: "Đang chờ", SENT: "Đã hỏi", WAITING: "Đang chờ", OVERDUE: "Quá hạn", RECEIVED: "Đã đủ", CANCELLED: "Đã huỷ",
}
const OPEN = new Set(["OPEN", "SENT", "WAITING", "OVERDUE"])

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || "Không thực hiện được")
  return json
}

/** Yêu cầu bổ sung thông tin của đơn (checklist ALG 4.14): tự sinh khi thiếu, tự đóng khi đủ, tạo/đóng tay. */
export function OrderInfoRequests({ orderId }: { orderId: string }) {
  const { can } = useSession()
  const canEdit = Boolean(can("R3"))
  const [items, setItems] = useState<InfoRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({ label: "", requestedFrom: "Khách đặt hàng" })
  const [cancelling, setCancelling] = useState<{ id: string; reason: string } | null>(null)
  const base = `/api/v1/orders/${orderId}/info-requests`

  const reload = () => call(base).then((j) => setItems(j.data as InfoRequest[])).catch((e: Error) => setError(e.message))
  useEffect(() => {
    call(base).then((j) => setItems(j.data as InfoRequest[])).catch((e: Error) => setError(e.message))
  }, [base])

  const close = async (id: string, outcome: "RECEIVED" | "CANCELLED", note?: string) => {
    try {
      await call(`${base}/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome, note }) })
      setCancelling(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được")
    }
  }

  const add = async () => {
    const label = draft.label.trim()
    if (!label) return
    try {
      await call(base, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: `custom:${label.slice(0, 50)}`, label, reason: `Cần bổ sung ${label.toLowerCase()}`, requested_from: draft.requestedFrom.trim() || "Khách đặt hàng", due_at: new Date(Date.now() + 2 * 3600_000).toISOString() }),
      })
      setDraft({ label: "", requestedFrom: draft.requestedFrom })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được yêu cầu")
    }
  }

  if (items.length === 0 && !canEdit && !error) return null
  return (
    <div className="rounded-lg border border-border p-3 text-caption">
      <div className="mb-2 flex items-center gap-1.5 font-bold text-text"><AlertCircle className="h-4 w-4" /> Thông tin cần bổ sung</div>
      {error && <p role="alert" className="mb-2 text-danger">{error}</p>}
      {items.length === 0 && <p className="text-text-muted">Đơn đã đủ thông tin để giao.</p>}
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-1.5 last:border-none">
            <span className="text-text">
              <span className="font-semibold">{r.label}</span> · hỏi {r.requestedFrom}{r.dueAt ? ` · hạn ${formatDateTime(r.dueAt)}` : ""}
              <span className={r.status === "OVERDUE" ? "ml-1 text-danger" : "ml-1 text-text-muted"}>({STATUS_TEXT[r.status] ?? r.status})</span>
            </span>
            {canEdit && OPEN.has(r.status) && cancelling?.id === r.id && (
              <span className="flex w-full gap-1">
                <Input value={cancelling.reason} onChange={(e) => setCancelling({ id: r.id, reason: e.target.value })} placeholder="Lý do huỷ yêu cầu" aria-label="Lý do huỷ yêu cầu" className="h-9 flex-1" />
                <Button type="button" size="xs" variant="outline" disabled={!cancelling.reason.trim()} onClick={() => void close(r.id, "CANCELLED", cancelling.reason.trim())}>Xác nhận huỷ</Button>
              </span>
            )}
            {canEdit && OPEN.has(r.status) && cancelling?.id !== r.id && (
              <span className="flex gap-1">
                <Button type="button" size="xs" variant="outline" onClick={() => void close(r.id, "RECEIVED")}>Đã nhận</Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => setCancelling({ id: r.id, reason: "" })}>Huỷ</Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Thông tin còn thiếu, vd: giờ nhận hoa" aria-label="Thông tin còn thiếu" className="h-9 flex-1" />
          <Input value={draft.requestedFrom} onChange={(e) => setDraft({ ...draft, requestedFrom: e.target.value })} placeholder="Hỏi ai" aria-label="Hỏi ai" className="h-9 w-40" />
          <Button type="button" size="xs" variant="secondary" onClick={() => void add()} disabled={!draft.label.trim()}>Thêm yêu cầu</Button>
        </div>
      )}
    </div>
  )
}
