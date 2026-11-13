"use client"

import { useCallback, useEffect, useState } from "react"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"
import { ordersWorkspaceApi, type WorkbenchItem, type WorkbenchStage } from "./orders-workspace-api"
import { ConfirmPaymentAction, DeliverBeforePayAction, QuoteAction } from "./workbench-actions"

const STAGE: Record<WorkbenchStage, { label: string; tone: "accent" | "warning" | "neutral" | "success" | "danger" }> = {
  NEEDS_QUOTE: { label: "Chờ báo giá", tone: "warning" },
  AWAITING_PAYMENT: { label: "Chờ khách trả", tone: "accent" },
  AWAITING_APPROVAL: { label: "Chờ Điều hành duyệt", tone: "warning" },
  IN_COORDINATION: { label: "Đang điều phối, còn nợ", tone: "neutral" },
  DELIVERED_UNPAID: { label: "Đã giao, còn nợ", tone: "danger" },
}

/**
 * Đơn ngoài Thẻ chào cần xử lý. `mode="sale"`: báo giá, xin giao trước. `mode="approve"`: Điều hành xác nhận tiền.
 */
export function WorkbenchList({ mode }: { mode: "sale" | "approve" }) {
  const { can } = useSession()
  const [items, setItems] = useState<WorkbenchItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    ordersWorkspaceApi.workbench().then((r) => setItems(r.items)).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const onDone = (message: string) => {
    setNotice(message)
    load()
  }
  const onFail = (message: string) => setNotice(message)

  const visible = (items ?? []).filter((i) =>
    mode === "sale" ? i.stage !== "IN_COORDINATION" : i.stage !== "NEEDS_QUOTE" && i.balanceVnd > 0,
  )

  if (error) return <InlineError message={error} onRetry={load} />
  if (items === null) return <SkeletonBlock lines={3} label="Đang tải đơn cần xử lý" />
  return (
    <div className="space-y-3">
      {notice && <p role="status" className="rounded-xl bg-surface-alt px-3 py-2 text-body-sm text-text">{notice}</p>}
      {visible.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Không có đơn cần xử lý" reason="Đơn từ catalog, trò chuyện, nhập tay và kênh bán ngoài cần báo giá hoặc thu tiền sẽ hiện ở đây." />
      ) : (
        <ul className="space-y-2">
          {visible.map((i) => (
            <li key={i.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-text">{i.code}</span>
                  <Badge tone={STAGE[i.stage].tone}>{STAGE[i.stage].label}</Badge>
                  {i.collectOverdue && <Badge tone="danger">Quá hạn thu</Badge>}
                </div>
                <p className="text-body-sm text-text">
                  {i.recipientName ?? "Khách"}{i.phone ? ` · ${i.phone}` : ""}
                </p>
                <p className="text-caption text-text-muted">
                  {i.sourceLabel} · {formatDateTime(i.createdAt)} · Tổng {formatCurrency(i.totalVnd)} · Đã thu {formatCurrency(i.paidVnd)}
                </p>
              </div>
              <div className="shrink-0">
                {mode === "sale" && i.stage === "NEEDS_QUOTE" && can("R15") && <QuoteAction item={i} onDone={onDone} onFail={onFail} />}
                {mode === "sale" && i.stage === "AWAITING_PAYMENT" && can("R2") && <DeliverBeforePayAction item={i} onDone={onDone} onFail={onFail} />}
                {mode === "approve" && can("R11") && <ConfirmPaymentAction item={i} onDone={onDone} onFail={onFail} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
