"use client"

import React, { useState } from "react"
import { Award } from "@/components/ui/icon-set/award"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Star } from "@/components/ui/icon-set/star"
import { FileCheck } from "@/components/ui/icon-set/file-check"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, type CoordinationOrder } from "@/components/coordinator/coordinator-api"

/**
 * P7 — Nghiệm thu & đóng đơn (Template T25/T26, F14).
 *
 * SLA và điều kiện đóng đơn đọc từ dữ liệu thật của đơn (giờ hẹn, giờ giao
 * thực tế, QC, POD, sự cố). Bản trước in cứng "SLA XUẤT SẮC — GIAO SỚM 12
 * PHÚT" và năm dấu tích xanh bất kể đơn thế nào. Máy chủ vẫn là nơi quyết
 * định cuối (chặn đóng khi còn sự cố).
 */
export interface OrderClosureModalProps {
  isOpen: boolean
  order: CoordinationOrder | null
  onClose: () => void
  onSubmit: (input: { partnerRating?: number; partnerPayoutVnd?: number; payoutReason?: string; notes?: string }) => Promise<void>
}

function slaSummary(order: CoordinationOrder): { label: string; tone: "ok" | "late" | "unknown" } {
  const target = order.deliveryTargetAt ? new Date(order.deliveryTargetAt) : null
  const actual = order.delivery.actualDeliveryAt ? new Date(order.delivery.actualDeliveryAt) : null
  if (!target || !actual) return { label: "Không đo được (thiếu giờ hẹn hoặc giờ giao)", tone: "unknown" }
  const diff = Math.round((actual.getTime() - target.getTime()) / 60_000)
  if (diff <= 0) return { label: `Đúng hẹn (sớm ${Math.abs(diff)} phút)`, tone: "ok" }
  return { label: `Trễ ${diff} phút`, tone: "late" }
}

export function OrderClosureModal({ isOpen, order, onClose, onSubmit }: OrderClosureModalProps) {
  const [partnerRating, setPartnerRating] = useState<number>(5)
  const [closureNotes, setClosureNotes] = useState("")
  // `null` = giữ số chuẩn của đơn (phí gia công còn trả / số thoả thuận, audit BL-22)
  const [payout, setPayout] = useState<string | null>(null)
  const [payoutReason, setPayoutReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !order) return null

  const sla = slaSummary(order)
  const checks = [
    { ok: order.stage === "DELIVERED", label: "Đơn ở bước Đã giao" },
    { ok: Boolean(order.delivery.podImageUrl || order.delivery.podRecipientName), label: "Có bằng chứng giao (POD)" },
    { ok: order.qc?.status === "PASSED", label: "QC gần nhất: Đạt" },
    { ok: Boolean(order.partner), label: `Đối tác: ${order.partnerName ?? "chưa phân công"}` },
    { ok: !order.hasException, label: "Không còn sự cố mở" },
  ]
  const ready = checks.every((c) => c.ok)
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN") : "—")

  const reference = order.partnerPayoutVnd
  const payoutText = payout ?? (reference === null ? "" : String(reference))
  const payoutNumber = payoutText.trim() === "" ? undefined : Number(payoutText)
  const changed = reference !== null && payoutNumber !== undefined && payoutNumber !== reference

  const handleClose = async () => {
    if (payoutNumber !== undefined && (!Number.isFinite(payoutNumber) || payoutNumber < 0)) {
      setError("Tiền công đối tác phải là số không âm.")
      return
    }
    if (changed && payoutReason.trim().length < 5) {
      setError("Tiền công khác số đã chốt — ghi lý do điều chỉnh.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        ...(order.partner ? { partnerRating } : {}),
        ...(payoutNumber !== undefined ? { partnerPayoutVnd: payoutNumber } : {}),
        ...(changed ? { payoutReason: payoutReason.trim() } : {}),
        ...(closureNotes.trim() ? { notes: closureNotes.trim() } : {}),
      })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="md"
      className="max-w-xl"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-success-bg text-success-text flex items-center justify-center">
            <Award size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-alt text-text text-caption font-black uppercase border border-border">
                BƯỚC 7 • HOÀN TẤT ĐƠN
              </span>
              <h3 className="text-body font-extrabold text-text">Nghiệm Thu & Đóng Đơn (T25/T26)</h3>
            </div>
          </div>
        </div>
      }
      description={`Đơn #${order.orderCode}`}
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button
            size="sm"
            disabled={busy || !ready}
            onClick={handleClose}
            className="bg-success hover:bg-success-text text-white font-bold gap-1.5 px-4"
          >
            <CheckCircle2 size={14} />
            <span>{busy ? "Đang đóng đơn…" : "Hoàn tất & đóng đơn"}</span>
          </Button>
        </div>
      }
    >
      <div className="p-1 flex flex-col gap-4 text-caption">
        <div
          className={`p-4 rounded-xl border flex flex-col gap-2 ${
            sla.tone === "ok" ? "border-success-border bg-success-bg/50" : sla.tone === "late" ? "border-warning-border bg-warning-bg/50" : "border-border bg-surface-alt"
          }`}
        >
          <span className="font-extrabold text-text flex items-center gap-1.5">
            <Clock size={14} /> SLA giao hàng: {sla.label}
          </span>
          <div className="grid grid-cols-2 gap-2 text-caption">
            <div>
              <span className="text-text-muted block">Hẹn với khách:</span>
              <strong className="text-text">{order.deliveryTargetAt ? fmt(order.deliveryTargetAt) : order.deliveryTargetTime}</strong>
            </div>
            <div>
              <span className="text-text-muted block">Giao thực tế:</span>
              <strong className="text-text">{fmt(order.delivery.actualDeliveryAt)}</strong>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface-alt flex flex-col gap-2">
          <span className="font-bold text-text flex items-center gap-1.5">
            <FileCheck size={14} className="text-danger-text" /> Điều kiện đóng đơn:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-caption">
            {checks.map((c) => (
              <div key={c.label} className={`flex items-center gap-1.5 font-semibold ${c.ok ? "text-success-text" : "text-danger-text"}`}>
                {c.ok ? <CheckCircle2 size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface flex flex-col gap-3">
          {order.partner && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-text">Chấm đối tác {order.partnerName}:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <Button variant="ghost"
                  type="button"
                  key={star}
                  aria-label={`${star} sao`}
                  onClick={() => setPartnerRating(star)}
                  className="text-[length:inherit] h-auto font-[inherit] gap-0 p-0.5 cursor-pointer"
                >
                  <Star size={20} className={star <= partnerRating ? "fill-warning text-warning-text" : "text-text-muted"} />
                </Button>
              ))}
            </div>
          )}
          <div>
            <label className="font-bold text-text block mb-1">Tiền công trả đối tác (VNĐ):</label>
            <Input
              type="number"
              min={0}
              value={payoutText}
              onChange={(e) => setPayout(e.target.value)}
              placeholder="Để trống nếu chưa chốt"
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
            />
            {reference !== null && (
              <span className="mt-1 block text-text-muted">Số đã chốt: {reference.toLocaleString("vi-VN")} đ (phí gia công sau khấu trừ hoặc giá thoả thuận)</span>
            )}
          </div>
          {changed && (
            <div>
              <label className="font-bold text-text block mb-1">Lý do điều chỉnh tiền công:</label>
              <Textarea
                rows={2}
                value={payoutReason}
                onChange={(e) => setPayoutReason(e.target.value)}
                placeholder="Ví dụ: đối tác làm thêm phụ kiện theo yêu cầu khách"
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:border-danger"
              />
            </div>
          )}
          <div>
            <label className="font-bold text-text block mb-1">Ghi chú nghiệm thu:</label>
            <Textarea
              rows={2}
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:border-danger"
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text font-semibold">
            {error}
          </div>
        )}
      </div>
    </Dialog>
  )
}
