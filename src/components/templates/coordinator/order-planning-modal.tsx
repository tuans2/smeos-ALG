"use client"

import React, { useState } from "react"
import { ClipboardList } from "@/components/ui/icon-set/clipboard-list"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Layers } from "@/components/ui/icon-set/layers"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, type CoordinationOrder } from "@/components/coordinator/coordinator-api"

export interface OrderPlanningModalProps {
  isOpen: boolean
  order: CoordinationOrder | null
  onClose: () => void
  /** Chốt kế hoạch: máy chủ chuyển đơn sang PLANNING kèm việc kế tiếp. */
  onConfirmPlan: (nextAction: string) => Promise<void>
}

export function OrderPlanningModal({
  isOpen,
  order,
  onClose,
  onConfirmPlan,
}: OrderPlanningModalProps) {
  const [productionTargetTime, setProductionTargetTime] = useState("16:00")
  const [pickupTargetTime, setPickupTargetTime] = useState("16:30")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planningNotes, setPlanningNotes] = useState("")

  if (!isOpen || !order) return null

  const addr = order.deliveryAddress as Record<string, unknown> | string | null
  const formattedAddress: string =
    typeof addr === "object" && addr !== null
      ? [addr.street, addr.ward, addr.district, addr.city].filter((v) => typeof v === "string" && v).join(", ")
      : String(addr ?? "")

  const handleConfirm = async () => {
    const plan = `Sản xuất xong ${productionTargetTime}, shipper lấy ${pickupTargetTime}${planningNotes.trim() ? ` — ${planningNotes.trim()}` : ""}`
    setBusy(true)
    setError(null)
    try {
      await onConfirmPlan(plan.slice(0, 300))
      setPlanningNotes("")
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
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-danger-bg text-danger-text flex items-center justify-center">
            <ClipboardList size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-alt text-text text-caption font-black uppercase border border-border">
                BƯỚC 2 • KẾ HOẠCH
              </span>
              <h3 className="text-body font-extrabold text-text">
                Lập Kế Hoạch Đơn Hàng (Order Planning — T02)
              </h3>
            </div>
          </div>
        </div>
      }
      description={`Đơn #${order.orderCode} • Thẩm định yêu cầu & Thiết lập mốc thời gian sản xuất`}
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy bỏ
          </Button>

          <Button
            size="sm"
            disabled={busy}
            onClick={handleConfirm}
            className="bg-danger hover:bg-danger-text text-white font-bold gap-1.5 px-4 shadow-sm"
          >
            <span>Chốt Kế Hoạch ➔ Tìm Đối Tác (Bước 3)</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      }
    >
      <div className="p-1 flex flex-col gap-4 text-caption">
        {/* 1. Tóm tắt thông tin tiếp nhận từ Sales */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-alt flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-dashed border-border/80 pb-2">
            <span className="font-bold text-text flex items-center gap-1.5">
              <Flower2 size={13} className="text-danger-text" />
              <span>Mẫu sản phẩm & Giá:</span>
              <strong className="text-text">{order.productTitle}</strong>
            </span>
            <span className="font-extrabold text-primary">
              {(order.unitPriceVnd || 0).toLocaleString("vi-VN")} đ
            </span>
          </div>

          <div className="flex items-start gap-3">
            {order.sampleImageUrl && (
              <div className="w-16 h-16 rounded-lg border border-danger-border overflow-hidden shrink-0 relative bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.sampleImageUrl}
                  alt={order.productTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 flex flex-col gap-1 text-caption">
              <div className="flex items-center gap-1 text-text-muted">
                <MapPin size={12} className="text-danger-text shrink-0" />
                <span className="text-text font-medium line-clamp-1">{formattedAddress}</span>
              </div>
              <div className="flex items-center gap-1 text-text-muted">
                <Clock size={12} className="text-primary shrink-0" />
                <span>Hẹn giao khách:</span>
                <strong className="text-text font-bold">{order.deliveryTargetTime}</strong>
              </div>
              {order.cardMessage && (
                <div className="text-caption text-text-muted line-clamp-1 italic">
                  Thiệp: “{order.cardMessage}”
                </div>
              )}
            </div>
          </div>

          {/* Atomic BOM ngắn gọn */}
          {order.flowers && order.flowers.length > 0 && (
            <div className="pt-2 border-t border-dashed border-border/80">
              <span className="text-caption font-bold text-text-muted block mb-1">
                Công thức cành hoa cần đối tác chuẩn bị:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {order.flowers.map((fl, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-surface border border-border text-caption font-medium text-text"
                  >
                    {fl.quantity} {fl.unit} {fl.flowerName} ({fl.color})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Thiết lập Timeline sản xuất lùi từ giờ giao khách (P2 Timeline) */}
        <div className="p-3.5 rounded-xl border border-danger-border bg-danger-bg/40 flex flex-col gap-3">
          <span className="font-extrabold text-danger-text text-caption flex items-center gap-1.5">
            <Calendar size={13} className="text-danger-text" />
            Thiết Lập Timeline Sản Xuất & Lấy Hàng (Reverse Scheduling):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-text block mb-1">
                Giờ xưởng phải cắm xong (Sẵn sàng QC) *
              </label>
              <Input
                type="time"
                required
                value={productionTargetTime}
                onChange={(e) => setProductionTargetTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text font-bold focus:outline-none focus:border-danger"
              />
              <span className="text-caption text-text-muted mt-0.5 block">
                Nên hoàn thiện trước giờ lấy hoa 30 phút để AI QC kiểm định
              </span>
            </div>

            <div>
              <label className="font-bold text-text block mb-1">
                Giờ Shipper lấy hoa (Pickup) *
              </label>
              <Input
                type="time"
                required
                value={pickupTargetTime}
                onChange={(e) => setPickupTargetTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text font-bold focus:outline-none focus:border-danger"
              />
              <span className="text-caption text-text-muted mt-0.5 block">
                Đảm bảo shipper kịp di chuyển trước giờ hẹn khách
              </span>
            </div>
          </div>
        </div>

        {/* 3. Rủi ro do máy chủ tính từ giờ hẹn + sự cố (F09) — không tự chọn tay */}
        <div className="p-3 rounded-xl border border-border bg-surface-alt flex items-center gap-2">
          <AlertTriangle size={13} className="text-warning-text" />
          <span>
            Rủi ro hiện tại: <strong>{order.riskLevel}</strong>
            {order.riskReason ? ` — ${order.riskReason}` : ""}
          </span>
        </div>

        {/* 4. Ghi chú chỉ đạo kỹ thuật */}
        <div>
          <label className="font-bold text-text block mb-1">
            Ghi chú chỉ đạo cho đối tác xưởng (Order Plan Notes):
          </label>
          <Textarea
            rows={2}
            placeholder="Ví dụ: Gia công tỉ mỉ theo mẫu thiết kế, đóng gói quy chuẩn chống va đập, thiệp in chuẩn chữ đẹp..."
            value={planningNotes}
            onChange={(e) => setPlanningNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text text-caption font-semibold">
            {error}
          </div>
        )}
      </div>
    </Dialog>
  )
}
