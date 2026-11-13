"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { useSWRConfig } from "swr"
import { Clock, Pencil, Phone, Send, User } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { vnDeadlineLabel } from "@/modules/greeting-card/domain/customer-cancellation-notice"
import type { OrderDetailModalTarget } from "./brochure-order-detail-modal"

/** Tên mặc định của link chưa ghi tên khách (máy chủ đặt). */
export const UNNAMED_LINK_CUSTOMER = "Khách đang xem mẫu"

const INPUT = "h-10 w-full rounded-lg border border-border bg-surface px-3 text-body-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"

/**
 * Link đã gửi mà khách chưa đặt đơn: hiện lúc gửi / lúc khách mở / lúc xem gần nhất để Sale nhớ ra
 * đã gửi cho ai, và cho Sale ghi tên (+ SĐT) khách lên link (PO 16/10/2026).
 */
export function LinkCustomerCard({
  target,
  onSaved,
}: {
  target: OrderDetailModalTarget
  onSaved?: ((customer: { customerName: string; customerPhone: string | null }) => void) | undefined
}) {
  const { mutate } = useSWRConfig()
  const named = Boolean(target.customerName && target.customerName !== UNNAMED_LINK_CUSTOMER)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(named ? target.customerName ?? "" : "")
  const [phone, setPhone] = useState(target.customerPhone ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sentAt = target.copiedAt ?? target.createdAt
  const times = [
    sentAt ? { label: target.copiedAt ? "Gửi link" : "Tạo link", at: vnDeadlineLabel(sentAt) } : null,
    { label: "Khách mở lần đầu", at: target.openedAt ? vnDeadlineLabel(target.openedAt) : "Chưa mở" },
    target.openedAt && target.lastActiveAt ? { label: "Xem gần nhất", at: vnDeadlineLabel(target.lastActiveAt) } : null,
  ].filter((t): t is { label: string; at: string } => t !== null)

  async function save() {
    if (!target.sessionId || !name.trim()) return setError("Vui lòng nhập tên khách")
    setBusy(true)
    setError(null)
    try {
      const res = await apiSend<{ data: { customerName: string; customerPhone: string | null } }>(
        `/api/v1/greeting-card/send-links/${target.sessionId}/customer`,
        "PATCH",
        { customer_name: name.trim(), customer_phone: phone.trim() || null },
      )
      onSaved?.(res.data)
      setEditing(false)
      void mutate((key) => (Array.isArray(key) ? String(key[0]) : String(key)).includes("/api/v1/greeting-card/tracking"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được, vui lòng thử lại")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-1 text-caption font-bold uppercase tracking-wider text-text-muted">
            <User size={13} /> Link đã gửi cho
          </span>
          <p className="text-body-sm font-bold text-text">{named ? target.customerName : "Chưa ghi tên khách"}</p>
          {target.customerPhone && (
            <a href={`tel:${target.customerPhone}`} className="inline-flex items-center gap-1 text-caption font-bold text-primary hover:underline">
              <Phone size={12} /> {target.customerPhone}
            </a>
          )}
        </div>
        {!editing && target.sessionId && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} className="shrink-0 gap-1.5 text-caption">
            <Pencil size={13} /> {named ? "Sửa tên khách" : "Ghi tên khách"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input aria-label="Tên khách" placeholder="Tên khách (VD: Chị Lan)" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
            <Input aria-label="Số điện thoại khách" placeholder="SĐT (không bắt buộc)" inputMode="tel" maxLength={15} value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} />
          </div>
          {error && <p role="alert" className="text-caption font-medium text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setError(null) }} disabled={busy}>Huỷ</Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void save()} disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</Button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-1 border-t border-border pt-2.5">
        {times.map((t) => (
          <li key={t.label} className="flex items-center justify-between gap-3 text-caption">
            <span className="flex items-center gap-1.5 text-text-muted">
              {t.label === "Gửi link" || t.label === "Tạo link" ? <Send size={12} /> : <Clock size={12} />} {t.label}
            </span>
            <span className="font-bold text-text">{t.at}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
