"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { ChevronLeft } from "@/components/ui/icon-set/chevron-left"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Button } from "@/components/ui/button"
import type { AvailabilityBoardProduct } from "@/modules/availability/use-cases/get-availability-board"
import type { ProductBookingRecord } from "@/modules/availability/domain/availability-mode"

export interface DailyCapacityBoardProps {
  products: AvailabilityBoardProduct[]
  bookings: ProductBookingRecord[]
  days: string[]
  currentMonth: string
  onMonthChange: (month: string) => void
}

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"]
  return days[d.getDay()] || ""
}

export function DailyCapacityBoard({
  products,
  bookings,
  days,
  currentMonth,
  onMonthChange,
}: DailyCapacityBoardProps) {
  const safeDays = Array.isArray(days) ? days : []
  const safeProducts = Array.isArray(products) ? products : []
  const safeBookings = Array.isArray(bookings) ? bookings : []

  const [selectedDay, setSelectedDay] = useState(safeDays[0] ?? new Date().toISOString().slice(0, 10))

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

  // Đếm số đơn theo ngày
  const dayBookings = safeBookings.filter((b) => selectedDay >= b.checkInDate && selectedDay < b.checkOutDate)
  const maxCapacity = 20 // Default capacity quota
  const currentCount = dayBookings.length
  const percentFilled = Math.min(100, Math.round((currentCount / maxCapacity) * 100))

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
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
      </div>

      {/* Daily Capacity Overview & Day Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Day selection strip */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3">
          <h3 className="text-body-sm font-bold text-text">Lịch các ngày trong tháng</h3>
          <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {safeDays.map((day) => {
              const count = safeBookings.filter((b) => day >= b.checkInDate && day < b.checkOutDate).length
              const isSelected = day === selectedDay
              const isFull = count >= maxCapacity

              return (
                <Button variant="ghost"
                  type="button"
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-auto gap-0 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-caption transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white font-bold shadow-xs hover:bg-primary"
                      : "bg-surface-alt hover:bg-surface-alt/80 text-text"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{day}</div>
                    <div className={`text-caption ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                      {getDayOfWeek(day)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-caption font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : isFull
                          ? "bg-danger/15 text-danger"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {count} / {maxCapacity} đơn
                    </span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <div className="text-caption font-semibold text-text-muted uppercase tracking-wider">
                {getDayOfWeek(selectedDay)}
              </div>
              <h2 className="text-title-sm font-bold text-text mt-0.5">Ngày {selectedDay}</h2>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-bold ${
                  percentFilled >= 100
                    ? "bg-danger/15 text-danger"
                    : percentFilled >= 75
                    ? "bg-warning/15 text-warning-text"
                    : "bg-success/15 text-success"
                }`}
              >
                {percentFilled >= 100 ? (
                  <AlertTriangle size={12} />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                <span>{percentFilled >= 100 ? "Đã đạt trần" : "Nhận đơn tốt"}</span>
              </span>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="space-y-2 rounded-xl border border-border bg-surface-alt/50 p-4">
            <div className="flex items-center justify-between text-caption">
              <span className="font-semibold text-text">Năng lực phục vụ ngày:</span>
              <span className="font-bold text-text">
                {currentCount} / {maxCapacity} đơn ({percentFilled}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  percentFilled >= 100 ? "bg-danger" : percentFilled >= 75 ? "bg-warning" : "bg-primary"
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          {/* Bookings / Orders list for the selected day */}
          <div className="space-y-3">
            <h3 className="text-body-sm font-bold text-text">
              Danh sách đơn đã đặt trong ngày ({dayBookings.length})
            </h3>
            {dayBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-caption text-text-muted">
                Chưa có đơn đặt trước nào cho ngày này. Khả năng nhận đơn tối đa {maxCapacity} đơn.
              </div>
            ) : (
              <div className="space-y-2">
                {dayBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-caption"
                  >
                    <div>
                      <div className="font-bold text-text">{b.customerName || "Khách đặt Online"}</div>
                      <div className="text-text-muted mt-0.5">
                        {b.orderCode ? `Mã đơn: ${b.orderCode}` : "Đặt trực tiếp"}
                        {b.customerPhone && ` · SĐT: ${b.customerPhone}`}
                      </div>
                    </div>
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-caption font-bold text-primary">
                      {b.orderId ? "Đã xác nhận" : "Khóa bảo trì"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
