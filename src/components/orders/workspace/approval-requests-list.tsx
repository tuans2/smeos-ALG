"use client"

import { useCallback, useEffect, useState } from "react"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime } from "@/lib/i18n/formatters"
import { ordersWorkspaceApi, type ApprovalItem } from "./orders-workspace-api"

/** Yêu cầu "giao trước, thu sau" ngoài chính sách đang chờ Điều hành (R16). Từ chối phải ghi lý do. */
export function ApprovalRequestsList() {
  const [items, setItems] = useState<ApprovalItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    ordersWorkspaceApi.approvals().then((r) => setItems(r.items)).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function decide(item: ApprovalItem, approve: boolean) {
    setBusy(item.id)
    try {
      await ordersWorkspaceApi.decide(item.id, approve, notes[item.id]?.trim() ?? "")
      setNotice(approve ? `Đã duyệt — đơn ${item.order.code} chuyển sang Điều phối` : `Đã từ chối yêu cầu của đơn ${item.order.code}`)
      load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Không thực hiện được")
    } finally {
      setBusy(null)
    }
  }

  if (error) return <InlineError message={error} onRetry={load} />
  if (items === null) return <SkeletonBlock lines={2} label="Đang tải yêu cầu chờ duyệt" />
  return (
    <div className="space-y-3">
      {notice && <p role="status" className="rounded-xl bg-surface-alt px-3 py-2 text-body-sm text-text">{notice}</p>}
      {items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Không có yêu cầu chờ duyệt" reason="Sale xin giao trước, thu sau cho đơn ngoài chính sách sẽ hiện ở đây." />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-body font-semibold text-text">Đơn {i.order.code} · Còn phải thu {formatCurrency(i.order.balanceVnd)}</p>
                <p className="text-body-sm text-text">Lý do: {i.reason}</p>
                <p className="text-caption text-text-muted">
                  Gửi lúc {formatDateTime(i.requestedAt)}{i.collectDueAt ? ` · Hạn thu đề xuất ${formatDateTime(i.collectDueAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label={`Ghi chú cho đơn ${i.order.code} (bắt buộc khi từ chối)`}
                  placeholder="Ghi chú (bắt buộc khi từ chối)"
                  value={notes[i.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [i.id]: e.target.value }))}
                  className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-body-sm text-text"
                />
                <Button type="button" size="sm" disabled={busy === i.id} onClick={() => void decide(i, true)}>Duyệt</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy === i.id || !notes[i.id]?.trim()} onClick={() => void decide(i, false)}>Từ chối</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
