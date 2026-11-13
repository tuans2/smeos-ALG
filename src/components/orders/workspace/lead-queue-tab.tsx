"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { UserPlus } from "@/components/ui/icon-set/user-plus"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/i18n/formatters"
import type { LeadHeat, LeadQueueItem } from "@/modules/orders/domain/lead-queue"
import { ordersWorkspaceApi } from "./orders-workspace-api"

const HEAT: Record<LeadHeat, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  HOT: { label: "Nóng", tone: "danger" },
  WARM: { label: "Ấm", tone: "warning" },
  COLD: { label: "Nguội", tone: "neutral" },
}

/** Tab "Khách tiềm năng" — hàng đợi chung của Sale: lead mọi nguồn + phiên Thẻ chào chưa đặt (chỉ xem, mở đúng màn). */
export function LeadQueueTab() {
  const [items, setItems] = useState<LeadQueueItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    ordersWorkspaceApi.leadQueue().then((r) => setItems(r.items)).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  if (error) return <InlineError message={error} onRetry={load} />
  if (items === null) return <SkeletonBlock lines={4} label="Đang tải khách tiềm năng" />
  if (items.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Chưa có khách tiềm năng"
        reason="Khách để lại số điện thoại, khách mở link chưa đặt và đơn quá hạn thanh toán sẽ hiện ở đây."
        action={{ label: "Tạo mã QR, link", href: "/thu-hut-khach" }}
      />
    )
  }
  return (
    <ul className="space-y-2" aria-label="Khách tiềm năng">
      {items.map((i) => (
        <li key={i.key} className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-semibold text-text">{i.name || "Khách chưa để tên"}</span>
              <Badge tone={HEAT[i.heat].tone}>{HEAT[i.heat].label}</Badge>
            </div>
            {i.phone && <a href={`tel:${i.phone}`} className="text-body-sm text-primary hover:underline">{i.phone}</a>}
            <p className="text-caption text-text-muted">
              {i.reasonLabel} · {i.sourceLabel} · {formatDateTime(i.lastActivityAt)}
              {i.nextFollowUpAt ? ` · Gọi lại: ${formatDateTime(i.nextFollowUpAt)}` : ""}
            </p>
          </div>
          <Link href={i.href as Route} className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-border px-4 text-body-sm font-semibold text-text hover:bg-surface-alt">
            Mở để chăm
          </Link>
        </li>
      ))}
    </ul>
  )
}
