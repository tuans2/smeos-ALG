"use client"

import { Disclosure } from "@/components/ui/disclosure"
import React, { useState } from "react"
import { BellRing, Clock, PencilLine } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { ShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import type { ChangeItem, ChangeStatus, OrderChangeSnapshot } from "@/modules/greeting-card/domain/order-change-request"
import { OrderChangeForm } from "./order-change-form"

export interface OrderChangeData {
  current: OrderChangeSnapshot
  shipping: ShippingConfig
  lockedReason: string | null
  /** Thiệp đã in kèm hoa — không đổi lời nhắn được nữa */
  cardLocked?: boolean
  pending: ChangeView | null
  history: ChangeView[]
}

interface ChangeView {
  id: string
  status: ChangeStatus
  createdAt: string
  decidedAt: string | null
  decisionNote: string | null
  changes: ChangeItem[]
  feeDeltaVnd: number
}

const when = (iso: string | null) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : ""
}
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`
const STATUS_LABEL: Record<ChangeStatus, string> = { PENDING: "Chờ cửa hàng xác nhận", APPROVED: "Đã cập nhật", REJECTED: "Không thay đổi" }

function ChangeList({ changes }: { changes: ChangeItem[] }) {
  return (
    <ul className="flex flex-col gap-1 text-body-sm">
      {changes.map((c) => (
        <li key={c.field}>
          <span className="font-bold text-text">{c.label}:</span>{" "}
          <span className="text-text-muted line-through">{c.before}</span> → <span className="text-text">{c.after}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Trên trang theo dõi (người đặt đã xác minh): thông báo kết quả yêu cầu gần nhất, yêu cầu đang chờ,
 * nút "Thay đổi thông tin" (khoá khi cửa hàng đã bắt đầu chế tác) và lịch sử thay đổi.
 */
export function OrderChangePanel({
  orderCode,
  proof,
  change,
  onChanged,
}: {
  orderCode: string
  proof: { sendCode?: string | null | undefined; last4?: string | null | undefined }
  change: OrderChangeData
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [sent, setSent] = useState(false)
  const latest = change.history[0]
  const decided = latest && latest.status !== "PENDING" ? latest : null

  return (
    <section aria-labelledby="order-change-title" className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted p-4">
      <h3 id="order-change-title" className="text-body font-extrabold text-text">Thay đổi thông tin đơn</h3>

      {decided && (
        <div role="status" className={`rounded-xl border p-3 flex gap-2 text-body-sm ${decided.status === "APPROVED" ? "border-success/30 bg-success-bg text-success" : "border-warning/30 bg-warning-bg text-warning-text"}`}>
          <BellRing size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-bold">
              {decided.status === "APPROVED" ? "Cửa hàng đã cập nhật đơn theo yêu cầu của bạn" : "Cửa hàng chưa đổi thông tin theo yêu cầu của bạn"}
              {decided.decidedAt && <span className="font-normal"> · {when(decided.decidedAt)}</span>}
            </p>
            <p className="text-text">{decided.changes.map((c) => c.label).join(", ")}</p>
            {decided.decisionNote && <p className="text-text">Cửa hàng nhắn: {decided.decisionNote}</p>}
            {decided.status === "APPROVED" && decided.feeDeltaVnd > 0 && (
              <p className="text-text">Phí giao tăng thêm {vnd(decided.feeDeltaVnd)} — vui lòng thanh toán phần còn lại.</p>
            )}
          </div>
        </div>
      )}

      {change.pending ? (
        <div className="rounded-xl border border-info/30 bg-info-bg p-3 flex flex-col gap-2">
          <p className="flex items-center gap-2 text-body-sm font-bold text-info">
            <Clock size={16} aria-hidden="true" /> {sent ? "Đã gửi yêu cầu — " : ""}Đang chờ cửa hàng xác nhận thay đổi
          </p>
          <ChangeList changes={change.pending.changes} />
          {change.pending.feeDeltaVnd > 0 && (
            <p className="text-caption text-text-muted">Nếu cửa hàng đồng ý, phí giao tăng thêm {vnd(change.pending.feeDeltaVnd)}.</p>
          )}
        </div>
      ) : change.lockedReason ? (
        <p className="rounded-xl bg-surface-muted p-3 text-body-sm text-text-muted">{change.lockedReason}</p>
      ) : editing ? (
        <OrderChangeForm
          orderCode={orderCode}
          proof={proof}
          current={change.current}
          shipping={change.shipping}
          cardLocked={change.cardLocked === true}
          onClose={() => setEditing(false)}
          onSent={() => { setEditing(false); setSent(true); onChanged() }}
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setEditing(true)} className="h-11 w-full gap-2 rounded-xl">
          <PencilLine size={16} aria-hidden="true" /> Đổi giờ giao, địa chỉ hoặc người nhận
        </Button>
      )}

      {change.history.some((h) => h.status !== "PENDING") && (
        <Disclosure label={`Lịch sử thay đổi (${change.history.filter((h) => h.status !== "PENDING").length})`}>
          <ol className="mt-3 flex flex-col gap-3">
            {change.history.filter((h) => h.status !== "PENDING").map((h) => (
              <li key={h.id} className="border-l-2 border-border pl-3">
                <p className="text-caption text-text-muted">
                  Gửi {when(h.createdAt)} · <span className={h.status === "APPROVED" ? "text-success font-bold" : "text-warning-text font-bold"}>{STATUS_LABEL[h.status]}</span>
                  {h.decidedAt ? ` ${when(h.decidedAt)}` : ""}
                </p>
                <ChangeList changes={h.changes} />
                {h.decisionNote && <p className="text-caption text-text-muted">Cửa hàng nhắn: {h.decisionNote}</p>}
              </li>
            ))}
          </ol>
        </Disclosure>
      )}
    </section>
  )
}
