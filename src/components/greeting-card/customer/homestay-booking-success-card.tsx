"use client"

import React from "react"
import { CheckCircle2, Calendar, MapPin, Phone, Clock, User, ShieldCheck, Home } from "@/components/ui/icons"
import { formatCompactVnd } from "@/modules/greeting-card/domain/customer-order-slip"

export interface HomestayBookingSuccessCardProps {
  order: {
    code: string
    recipientName?: string | null
    deliveryAddress?: string | null
    deliveryDate?: string | null
    deliveryTimeSlot?: string | null
    checkOutDate?: string | null
    paidVnd: number
    totalVnd: number
    productSnapshot?: { name?: string; imageUrl?: string | null } | null
    customerReportedPayment?: boolean
  }
  isPaid: boolean
}

function formatDate(iso?: string | null) {
  if (!iso) return "Chưa có ngày"
  try {
    const [y, m, d] = iso.split("-")
    if (y && m && d) return `${d}/${m}/${y}`
    return iso
  } catch {
    return iso
  }
}

export function HomestayBookingSuccessCard({ order, isPaid }: HomestayBookingSuccessCardProps) {
  const isDeposit = !isPaid && order.paidVnd > 0
  const remaining = Math.max(0, order.totalVnd - order.paidVnd)

  return (
    <div className="flex flex-col gap-5 rounded-2xl border-2 border-success/30 bg-success-bg/40 p-5 sm:p-6 shadow-sm">
      {/* Banner Thành Công */}
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-success text-white flex items-center justify-center shrink-0 shadow-sm">
          <CheckCircle2 size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/15 text-success font-extrabold text-caption uppercase tracking-wider mb-1">
            <ShieldCheck size={14} /> ĐÃ KHÓA PHÒNG & XÁC NHẬN GIỮ LỊCH
          </span>
          <h3 className="text-title-sm sm:text-title font-extrabold text-text leading-tight">
            Đặt phòng thành công!
          </h3>
          <p className="text-body-sm text-text-muted mt-1">
            Hệ thống đã tự động khóa phòng trên lịch lưu trú. Hẹn gặp quý khách vào ngày nhận phòng!
          </p>
        </div>
      </div>

      {/* Thông tin phòng & Lịch lưu trú */}
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Home className="text-primary shrink-0" size={20} />
          <div className="min-w-0 flex-1">
            <span className="text-caption text-text-muted block">Hạng phòng đã đặt</span>
            <span className="text-body font-bold text-text">
              {order.productSnapshot?.name || "Phòng nghỉ dưỡng Homestay"}
            </span>
          </div>
          <span className="text-caption font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg shrink-0">
            Mã #{order.code}
          </span>
        </div>

        {/* Ngày Check-in & Check-out */}
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-surface-alt border border-border/50">
            <div className="flex items-center gap-1.5 text-caption font-bold text-text-muted">
              <Calendar size={14} className="text-primary" /> Nhận phòng (Check-in)
            </div>
            <span className="text-body-sm font-extrabold text-text">
              {formatDate(order.deliveryDate)}
            </span>
            <span className="text-caption text-text-muted">
              {order.deliveryTimeSlot || "Từ 14:00"}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-surface-alt border border-border/50">
            <div className="flex items-center gap-1.5 text-caption font-bold text-text-muted">
              <Calendar size={14} className="text-primary" /> Trả phòng (Check-out)
            </div>
            <span className="text-body-sm font-extrabold text-text">
              {formatDate(order.checkOutDate)}
            </span>
            <span className="text-caption text-text-muted">Trước 12:00</span>
          </div>
        </div>

        {/* Khách lưu trú & Địa điểm */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border text-body-sm">
          {order.recipientName && (
            <div className="flex items-center gap-2 text-text-muted">
              <User size={15} className="shrink-0 text-text-muted" />
              <span>Khách lưu trú:</span>
              <strong className="text-text ml-auto">{order.recipientName}</strong>
            </div>
          )}
          {order.deliveryAddress && (
            <div className="flex items-start gap-2 text-text-muted">
              <MapPin size={15} className="shrink-0 mt-0.5 text-text-muted" />
              <span>Địa chỉ cơ sở:</span>
              <strong className="text-text text-right ml-auto flex-1 break-words">
                {order.deliveryAddress}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Tình trạng thanh toán & Nhắc nhở Check-in */}
      <div className="rounded-xl border border-success/30 bg-success/10 p-3.5 flex flex-col gap-1.5 text-body-sm">
        <div className="flex justify-between items-center font-bold">
          <span className="text-text">Tình trạng thanh toán:</span>
          <span className="text-success font-extrabold">
            {isPaid
              ? `Đã thanh toán đủ (${formatCompactVnd(order.totalVnd)})`
              : isDeposit
              ? `Đã nhận cọc ${formatCompactVnd(order.paidVnd)} · Còn lại ${formatCompactVnd(remaining)}`
              : "Đã ghi nhận chuyển khoản"}
          </span>
        </div>
        <p className="text-caption text-text-muted leading-relaxed">
          {isDeposit
            ? `Số tiền còn lại ${formatCompactVnd(remaining)} quý khách sẽ thanh toán khi làm thủ tục nhận phòng.`
            : isPaid
            ? "Đơn phòng đã được thanh toán toàn bộ. Quý khách chỉ cần xuất trình mã đơn hoặc CCCD khi đến nhận phòng."
            : "Bộ phận tiếp đón đã ghi nhận thông báo chuyển khoản và đang chuẩn bị phòng chu đáo nhất cho quý khách."}
        </p>
      </div>

      {/* Hướng dẫn Check-in & Hỗ trợ */}
      <div className="flex flex-col gap-1.5 text-caption text-text-muted px-1">
        <span className="font-bold text-text">💡 Lưu ý khi nhận phòng:</span>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Quý khách vui lòng chuẩn bị CMND/CCCD hoặc Hộ chiếu để làm thủ tục lưu trú.</li>
          <li>Quản gia sẽ liên hệ trước giờ nhận phòng để hỗ trợ đón tiếp và gửi hướng dẫn chỉ đường.</li>
          <li>Cần nhận phòng sớm hoặc hỗ trợ thêm? Vui lòng liên hệ hotline cơ sở lưu trú.</li>
        </ul>
      </div>
    </div>
  )
}
