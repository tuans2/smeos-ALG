"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Radio } from "@/components/ui/icon-set/radio"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime } from "@/lib/i18n/formatters"
import { isHrefOpen } from "@/lib/feature-lock"

interface QueueItem {
  orderId: string
  code: string
  sourceLabel: string
  stageLabel: string
  atRisk: boolean
  nextAction: string | null
  nextActionDue: string | null
  deliveryDate: string | null
  deliveryTimeSlot: string | null
  recipientName: string | null
  balanceVnd: number
}

/** Đơn ngoài Thẻ chào đang điều phối — xem nhanh tại Đơn hàng; xử lý chi tiết ở Tháp điều phối. */
export function CoordinationQueueList() {
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetch("/api/v1/orders/coordination-queue")
      .then(async (r) => (r.ok ? ((await r.json()) as { items: QueueItem[] }) : Promise.reject(new Error("Không tải được đơn đang điều phối"))))
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  if (error) return <InlineError message={error} onRetry={load} />
  if (items === null) return <SkeletonBlock lines={3} label="Đang tải đơn đang điều phối" />
  if (items.length === 0) {
    return <EmptyState icon={Radio} title="Không có đơn nguồn khác đang điều phối" reason="Đơn đã xác nhận tiền hoặc được duyệt giao trước sẽ hiện ở đây." />
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.orderId} className="space-y-1 rounded-2xl bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-semibold text-text">{i.code}</span>
              <Badge tone={i.atRisk ? "danger" : "neutral"}>{i.stageLabel}</Badge>
              {i.balanceVnd > 0 && <Badge tone="warning">Còn nợ {formatCurrency(i.balanceVnd)}</Badge>}
            </div>
            <p className="text-body-sm text-text">
              {i.recipientName ?? "Khách"}
              {i.deliveryDate ? ` · Giao ${i.deliveryDate}${i.deliveryTimeSlot ? ` ${i.deliveryTimeSlot}` : ""}` : ""}
            </p>
            <p className="text-caption text-text-muted">
              {i.sourceLabel}
              {i.nextAction ? ` · Việc tiếp: ${i.nextAction}` : ""}
              {i.nextActionDue ? ` · Hạn ${formatDateTime(i.nextActionDue)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {isHrefOpen("/dieu-phoi") && (
        <Link href="/dieu-phoi" className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-body-sm font-semibold text-text hover:bg-surface-alt">
          Xử lý trong Tháp điều phối
        </Link>
      )}
    </div>
  )
}
