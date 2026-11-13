"use client"

import { X } from "@/components/ui/icon-set/x"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { User } from "@/components/ui/icon-set/user"
import { Phone } from "@/components/ui/icon-set/phone"
import { Home } from "@/components/ui/icon-set/home"
import { Moon } from "@/components/ui/icon-set/moon"
import { CreditCard } from "@/components/ui/icon-set/credit-card"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Wrench } from "@/components/ui/icon-set/wrench"
import { Clock } from "@/components/ui/icon-set/clock"
import Link from "next/link"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ProductBookingRecord } from "@/modules/availability/domain/availability-mode"
import { calculateNights } from "@/components/greeting-card/customer/homestay-order-fields"
import { formatCurrency } from "@/lib/i18n/formatters"

export interface BookingDetailModalProps {
  isOpen: boolean
  booking: ProductBookingRecord | null
  onClose: () => void
  onRemoveBlock?: (bookingId: string) => Promise<void>
  isRemoving?: boolean
}

function formatVnd(amount: number): string {
  return formatCurrency(amount)
}

function formatDateVi(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

export function BookingDetailModal({
  isOpen,
  booking,
  onClose,
  onRemoveBlock,
  isRemoving = false,
}: BookingDetailModalProps) {
  if (!isOpen || !booking) return null

  const isManualBlock = !booking.orderId
  const nights = calculateNights(booking.checkInDate, booking.checkOutDate)
  const remainingVnd = (booking.totalVnd ?? 0) - (booking.paidVnd ?? 0)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        <div className="flex items-center gap-2">
          <span>{isManualBlock ? "Khóa phòng bảo trì" : "Chi tiết đặt phòng"}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold ${
              isManualBlock ? "bg-warning/20 text-warning-text" : "bg-primary/20 text-primary"
            }`}
          >
            {isManualBlock ? "Nội bộ / Khóa lịch" : "Khách đặt tự động"}
          </span>
        </div>
      }
      description={booking.orderCode ? `Mã đơn: #${booking.orderCode}` : undefined}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {isManualBlock && onRemoveBlock ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onRemoveBlock(booking.id)}
              disabled={isRemoving}
              className="gap-1.5"
            >
              <Trash2 size={14} />
              <span>{isRemoving ? "Đang mở khóa..." : "Mở khóa ngày này"}</span>
            </Button>
          ) : !isManualBlock && booking.orderCode ? (
            <Link
              href={`/don-hang?code=${booking.orderCode}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt px-3.5 py-2 text-caption font-bold text-text hover:bg-surface-alt/80 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Mở trang Đơn hàng</span>
            </Link>
          ) : (
            <div />
          )}

          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-caption p-1">
        {/* Thông tin phòng & Thời gian lưu trú */}
        <div className="rounded-xl border border-border bg-surface-alt/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted font-medium flex items-center gap-1.5">
              <Home size={14} className="text-primary" /> Phòng / Chỗ nghỉ:
            </span>
            <span className="font-bold text-text text-body-sm text-right">{booking.productName}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <div className="space-y-1">
              <span className="text-text-muted block text-caption">Nhận phòng (Check-in)</span>
              <span className="font-bold text-text flex items-center gap-1.5 text-caption">
                <Calendar size={13} className="text-primary shrink-0" />
                {formatDateVi(booking.checkInDate)}
              </span>
              <span className="text-caption font-medium text-text-muted flex items-center gap-1">
                <Clock size={11} className="text-primary/70 shrink-0" />
                {booking.checkInTimeSlot || "Từ 14:00 (Tiêu chuẩn)"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-text-muted block text-caption">Trả phòng (Check-out)</span>
              <span className="font-bold text-text flex items-center gap-1.5 text-caption">
                <Calendar size={13} className="text-primary shrink-0" />
                {formatDateVi(booking.checkOutDate)}
              </span>
              <span className="text-caption font-medium text-text-muted flex items-center gap-1">
                <Clock size={11} className="text-text-muted shrink-0" />
                Trước 12:00
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption">
            <span className="text-text-muted flex items-center gap-1">
              <Moon size={12} className="text-primary" /> Số đêm lưu trú:
            </span>
            <span className="font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
              {nights} đêm
            </span>
          </div>
        </div>

        {/* Nếu là đơn khách đặt: Thông tin khách hàng & Thanh toán */}
        {!isManualBlock && (
          <>
            {/* Khách hàng */}
            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
              <div className="text-caption font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-primary" /> Khách lưu trú
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text text-body-sm">
                  {booking.customerName || "Khách lẻ"}
                </span>
                {booking.customerPhone && (
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
                    title="Gọi điện cho khách"
                  >
                    <Phone size={12} />
                    <span>{booking.customerPhone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Thanh toán (nếu có dữ liệu) */}
            {typeof booking.totalVnd === "number" && booking.totalVnd > 0 && (
              <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5">
                <div className="text-caption font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-primary" /> Tình trạng thanh toán
                </div>
                <div className="space-y-1.5 text-caption">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Tổng tiền phòng:</span>
                    <span className="font-bold text-text">{formatVnd(booking.totalVnd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Đã thanh toán / cọc:</span>
                    <span className="font-bold text-success">{formatVnd(booking.paidVnd ?? 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/60">
                    <span className="font-semibold text-text">Còn lại cần thu khi nhận phòng:</span>
                    <span className="font-bold text-danger">
                      {remainingVnd > 0 ? formatVnd(remainingVnd) : "Đã thanh toán đủ"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ghi chú */}
        {booking.note && (
          <div className="rounded-xl border border-border bg-surface-alt/40 p-3.5 space-y-1">
            <span className="text-caption font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
              <FileText size={12} /> Ghi chú
            </span>
            <p className="text-text text-caption leading-relaxed whitespace-pre-wrap">{booking.note}</p>
          </div>
        )}
      </div>
    </Dialog>
  )
}
