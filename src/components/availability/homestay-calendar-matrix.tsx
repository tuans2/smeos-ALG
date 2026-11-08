"use client"

import { useState } from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { User } from "@/components/ui/icon-set/user"
import { Wrench } from "@/components/ui/icon-set/wrench"
import { ChevronLeft } from "@/components/ui/icon-set/chevron-left"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import type { AvailabilityBoardProduct } from "@/modules/availability/use-cases/get-availability-board"
import type { ProductBookingRecord } from "@/modules/availability/domain/availability-mode"
import { ManualBlockModal } from "./manual-block-modal"
import { BookingDetailModal } from "./booking-detail-modal"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

export interface HomestayCalendarMatrixProps {
  products: AvailabilityBoardProduct[]
  bookings: ProductBookingRecord[]
  days: string[]
  currentMonth: string
  onMonthChange: (month: string) => void
  onRefresh: () => void
}

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
  return days[d.getDay()] || ""
}

export function HomestayCalendarMatrix({
  products,
  bookings,
  days,
  currentMonth,
  onMonthChange,
  onRefresh,
}: HomestayCalendarMatrixProps) {
  const safeDays = Array.isArray(days) ? days : []
  const safeProducts = Array.isArray(products) ? products : []
  const safeBookings = Array.isArray(bookings) ? bookings : []
  const [confirm, confirmDialog] = useConfirmDialog()
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>()
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<ProductBookingRecord | null>(null)

  function openBlockModal(productId?: string, date?: string) {
    setSelectedProductId(productId)
    setSelectedDate(date)
    setModalOpen(true)
  }

  async function handleRemoveBlock(bookingId: string) {
    if (
      !(await confirm({
        title: "Xác nhận mở khóa ngày này?",
        consequence: "Ngày này sẽ chuyển sang trạng thái khả dụng để đón khách mới.",
        confirmLabel: "Mở khóa",
        tone: "default",
      }))
    ) {
      return
    }
    try {
      setDeletingId(bookingId)
      const res = await fetch(`/api/v1/availability/blocks/${bookingId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || "Không thể mở khóa")
      }
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setDeletingId(null)
    }
  }

  function handlePrevMonth() {
    const [yStr, mStr] = currentMonth.split("-")
    let y = parseInt(yStr!, 10)
    let m = parseInt(mStr!, 10) - 1
    if (m < 1) {
      m = 12
      y -= 1
    }
    onMonthChange(`${y}-${String(m).padStart(2, "0")}`)
  }

  function handleNextMonth() {
    const [yStr, mStr] = currentMonth.split("-")
    let y = parseInt(yStr!, 10)
    let m = parseInt(mStr!, 10) + 1
    if (m > 12) {
      m = 1
      y += 1
    }
    onMonthChange(`${y}-${String(m).padStart(2, "0")}`)
  }

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            aria-label="Tháng trước"
            className="h-9 w-9 p-0"
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="flex items-center gap-2 px-2">
            <Calendar size={18} className="text-primary" />
            <span className="text-title-sm font-bold text-text">
              Tháng {currentMonth.split("-")[1]}/{currentMonth.split("-")[0]}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            aria-label="Tháng sau"
            className="h-9 w-9 p-0"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-caption text-text-muted mr-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-primary/20 border border-primary/40" />
              Khách đặt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-warning/20 border border-warning/40" />
              Bảo trì / Đã khóa
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-surface-alt border border-border" />
              Trống / Khả dụng
            </span>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => openBlockModal()}
            className="gap-1.5"
          >
            <Plus size={14} />
            <span>Khóa ngày phòng</span>
          </Button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
        <table className="w-full border-collapse text-left text-caption">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              <th className="sticky left-0 z-10 min-w-[180px] bg-surface-alt p-3 font-bold text-text">
                Phòng / Chỗ nghỉ
              </th>
              {safeDays.map((day) => {
                const dayNum = day.slice(8)
                const dayOfWeek = getDayOfWeek(day)
                const isWeekend = dayOfWeek === "CN" || dayOfWeek === "T7"
                return (
                  <th
                    key={day}
                    className={`min-w-[46px] p-2 text-center border-l border-border/50 ${
                      isWeekend ? "bg-surface-alt/80 font-bold text-primary" : "text-text"
                    }`}
                  >
                    <div className="text-caption text-text-muted uppercase">{dayOfWeek}</div>
                    <div className="text-caption font-semibold">{dayNum}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {safeProducts.length === 0 ? (
              <tr>
                <td colSpan={safeDays.length + 1} className="p-8 text-center text-text-muted">
                  Chưa có phòng hoặc sản phẩm nào trong hệ thống.
                </td>
              </tr>
            ) : (
              safeProducts.map((prod) => {
                return (
                  <tr key={prod.id} className="border-b border-border hover:bg-surface-alt/40 transition-colors">
                    <td className="sticky left-0 z-10 bg-surface p-3 border-r border-border font-medium">
                      <div className="truncate font-semibold text-text text-body-sm">{prod.name}</div>
                      <div className="text-caption text-text-muted">Mã: {prod.code}</div>
                    </td>
                    {safeDays.map((day) => {
                      const matchedBookings = safeBookings.filter(
                        (b) => b.productId === prod.id && day >= b.checkInDate && day < b.checkOutDate
                      )

                      if (matchedBookings.length > 0) {
                        const booking = matchedBookings[0]!
                        const isBlocked = !booking.orderId
                        return (
                          <td
                            key={day}
                            className={`p-1 text-center border-l border-border/50 align-middle ${
                              isBlocked ? "bg-warning/15" : "bg-primary/15"
                            }`}
                          >
                            <Button variant="ghost"
                              type="button"
                              onClick={() => setSelectedBooking(booking)}
                              title={
                                isBlocked
                                  ? `Đã khóa: ${booking.note || "Bảo trì"} (Bấm để xem chi tiết)`
                                  : `Đơn: ${booking.orderCode || "Online"} - Khách: ${booking.customerName || "Khách lẻ"} (Bấm để xem chi tiết)`
                              }
                              className={`h-auto gap-0 group relative flex w-full flex-col items-center justify-center rounded-lg p-1 text-caption font-bold hover:opacity-85 transition-opacity cursor-pointer ${
                                isBlocked ? "text-warning hover:bg-warning/20" : "text-primary hover:bg-primary/20"
                              }`}
                            >
                              {isBlocked ? (
                                <div className="flex items-center gap-1">
                                  <Wrench size={10} className="shrink-0" />
                                  <span className="truncate max-w-[28px]">{booking.note?.slice(0, 3) || "KHÓA"}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 truncate max-w-[36px]">
                                  <User size={10} className="shrink-0" />
                                  <span className="truncate">{booking.customerName?.slice(0, 3) || "ĐẶT"}</span>
                                </div>
                              )}
                            </Button>
                          </td>
                        )
                      }

                      return (
                        <td
                          key={day}
                          className="group p-1 text-center border-l border-border/50 hover:bg-primary/5 transition-colors"
                        >
                          <Button variant="ghost"
                            type="button"
                            onClick={() => openBlockModal(prod.id, day)}
                            title={`Bấm để khóa ngày ${day}`}
                            className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-7 w-full items-center justify-center opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary transition-opacity cursor-pointer"
                          >
                            <Plus size={12} />
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <ManualBlockModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={onRefresh}
        products={products}
        preselectedProductId={selectedProductId}
        preselectedDate={selectedDate}
      />

      <BookingDetailModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onRemoveBlock={async (id) => {
          await handleRemoveBlock(id)
          setSelectedBooking(null)
        }}
        isRemoving={deletingId === selectedBooking?.id}
      />
      {confirmDialog}
    </div>
  )
}
