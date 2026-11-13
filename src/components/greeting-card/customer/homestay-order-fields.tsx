"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import React, { useId } from "react"
import { Calendar, Home, Clock, Car, Bike, Plane, CheckCircle2 } from "@/components/ui/icons"
import { ViDateInput } from "./vi-date-input"
import { HomestayGuestFields } from "./homestay-guest-fields"
import { AvailabilityIndicator } from "./availability-indicator"
import type { AvailabilityMode } from "@/modules/greeting-card/domain/product-availability-config"

export interface HomestayAvailabilityState {
  available: boolean | null
  mode?: AvailabilityMode | null
  message?: string | null
  nextAvailableDate?: string | null
  remainingQuantity?: number | null
  loading?: boolean
  unavailableDates?: string[]
}

interface HomestayOrderFieldsProps {
  idPrefix?: string | undefined
  inputClassName: string
  checkInDate: string
  checkOutDate: string
  minDate: string
  maxDate: string
  checkInTimeSlot: string
  customerName?: string | undefined
  customerPhone?: string | undefined
  recipientName: string
  recipientPhone: string
  isSelfBooking: boolean
  adultsCount: number
  childrenCount: number
  transitMethod: string
  specialRequests: string
  homestayAddress?: string | null | undefined
  homestayName?: string | null | undefined
  availability?: HomestayAvailabilityState | undefined
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
  onTimeSlotChange: (slot: string) => void
  onRecipientNameChange: (name: string) => void
  onRecipientPhoneChange: (phone: string) => void
  onSelfBookingToggle: (isSelf: boolean) => void
  onAdultsChange: (count: number) => void
  onChildrenChange: (count: number) => void
  onTransitChange: (transit: string) => void
  onSpecialRequestsChange: (text: string) => void
  /** false khi ô yêu cầu đặc biệt hiển thị ở khối Ghi chú riêng */
  showSpecialRequests?: boolean | undefined
  /** false khi công tắc tự đặt phòng hiển thị ở khối Người mua */
  showSelfToggle?: boolean | undefined
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1
  const t1 = new Date(`${checkIn}T00:00:00Z`).getTime()
  const t2 = new Date(`${checkOut}T00:00:00Z`).getTime()
  const diffDays = Math.round((t2 - t1) / 86_400_000)
  return diffDays > 0 ? diffDays : 1
}

const CHECK_IN_SLOTS = [
  "14:00 - 16:00 (Tiêu chuẩn)",
  "16:00 - 18:00 (Chiều)",
  "18:00 - 21:00 (Buổi tối)",
  "Sau 21:00 (Nhận phòng muộn)",
]

const TRANSIT_OPTIONS = [
  { key: "CAR", label: "Ô tô riêng (cần chỗ đỗ)", icon: Car },
  { key: "BIKE", label: "Xe máy", icon: Bike },
  { key: "TAXI", label: "Taxi / Xe đưa đón", icon: Plane },
]

export function HomestayOrderFields({
  idPrefix,
  inputClassName,
  checkInDate,
  checkOutDate,
  minDate,
  maxDate,
  checkInTimeSlot,
  recipientName,
  recipientPhone,
  isSelfBooking,
  adultsCount,
  childrenCount,
  transitMethod,
  specialRequests,
  homestayAddress,
  homestayName,
  availability,
  onCheckInChange,
  onCheckOutChange,
  onTimeSlotChange,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onSelfBookingToggle,
  onAdultsChange,
  onChildrenChange,
  onTransitChange,
  onSpecialRequestsChange,
  showSpecialRequests = true,
  showSelfToggle = true,
}: HomestayOrderFieldsProps) {
  const uid = idPrefix || useId()
  const nights = calculateNights(checkInDate, checkOutDate)

  // Ngày checkout tối thiểu = ngày checkin + 1 ngày
  const minCheckOut = checkInDate
    ? new Date(new Date(`${checkInDate}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
    : minDate

  return (
    <div className="flex flex-col gap-4">
      {/* 1. KHỐI LỊCH NHẬN & TRẢ PHÒNG */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-body-sm font-extrabold text-text flex items-center gap-2">
            <Calendar size={17} className="text-primary" />
            <span>Thời gian lưu trú</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-extrabold bg-primary text-white shadow-xs">
            🌙 {nights} đêm lưu trú
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-checkInDate`} className="block text-caption font-bold text-text mb-1">
              Ngày nhận phòng (Check-in) <span className="text-danger">*</span>
            </label>
            <ViDateInput
              id={`${uid}-checkInDate`}
              required
              min={minDate}
              max={maxDate}
              value={checkInDate}
              onChange={(val) => {
                onCheckInChange(val)
                if (!checkOutDate || checkOutDate <= val) {
                  const nextDay = new Date(new Date(`${val}T00:00:00Z`).getTime() + 86_400_000)
                    .toISOString()
                    .slice(0, 10)
                  onCheckOutChange(nextDay)
                }
              }}
              className={inputClassName}
            />
            <span className="text-caption text-text-muted mt-0.5 block">Nhận phòng từ 14:00</span>
          </div>

          <div>
            <label htmlFor={`${uid}-checkOutDate`} className="block text-caption font-bold text-text mb-1">
              Ngày trả phòng (Check-out) <span className="text-danger">*</span>
            </label>
            <ViDateInput
              id={`${uid}-checkOutDate`}
              required
              min={minCheckOut}
              max={maxDate}
              value={checkOutDate}
              onChange={onCheckOutChange}
              className={inputClassName}
            />
            <span className="text-caption text-text-muted mt-0.5 block">Trả phòng trước 12:00</span>
          </div>
        </div>

        {/* Báo cáo trạng thái khả dụng phòng real-time */}
        {availability && (
          <AvailabilityIndicator
            available={availability.available}
            mode={availability.mode}
            message={availability.message}
            nextAvailableDate={availability.nextAvailableDate}
            remainingQuantity={availability.remainingQuantity}
            loading={availability.loading}
            onSelectDate={onCheckInChange}
          />
        )}

        {/* Khung giờ nhận phòng */}
        <div>
          <label htmlFor={`${uid}-checkInTime`} className="block text-caption font-bold text-text mb-1">
            Giờ nhận phòng dự kiến
          </label>
          <div className="relative">
            <NativeSelect
              id={`${uid}-checkInTime`}
              value={checkInTimeSlot}
              onChange={(e) => onTimeSlotChange(e.target.value)}
              className={inputClassName}
            >
              <option value="">— Chọn khung giờ dự kiến đến —</option>
              {CHECK_IN_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </NativeSelect>
            <Clock size={15} className="absolute right-3 top-3.5 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. KHỐI THÔNG TIN KHÁCH LƯU TRÚ (Đã tách thành sub-component HomestayGuestFields) */}
      <HomestayGuestFields
        uid={uid}
        inputClassName={inputClassName}
        isSelfBooking={isSelfBooking}
        recipientName={recipientName}
        recipientPhone={recipientPhone}
        adultsCount={adultsCount}
        childrenCount={childrenCount}
        onSelfBookingToggle={onSelfBookingToggle}
        onRecipientNameChange={onRecipientNameChange}
        onRecipientPhoneChange={onRecipientPhoneChange}
        onAdultsChange={onAdultsChange}
        onChildrenChange={onChildrenChange}
        hideSelfToggle={!showSelfToggle}
      />

      {/* 3. KHỐI ĐỊA ĐIỂM HOMESTAY & PHƯƠNG TIỆN */}
      <div className="p-4 rounded-xl border border-border bg-surface-alt/30 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-body-sm font-extrabold text-text">
          <Home size={17} className="text-primary" />
          <span>Địa điểm lưu trú & Đón tiếp</span>
        </div>

        <div className="p-3 rounded-lg border border-border bg-bg text-body-sm">
          <div className="font-bold text-text">{homestayName || "Homestay / Biệt thự nghỉ dưỡng"}</div>
          <div className="text-text-muted text-caption mt-0.5">
            {homestayAddress || "Quý khách đến trực tiếp cơ sở để nhận phòng. Quản gia sẽ đón tiếp và bàn giao chìa khóa."}
          </div>
        </div>

        <div>
          <label className="block text-caption font-bold text-text mb-1.5">
            Phương tiện di chuyển đến (để chuẩn bị chỗ đỗ xe)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TRANSIT_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = transitMethod === opt.key
              return (
                <Button variant="outline"
                  type="button"
                  key={opt.key}
                  onClick={() => onTransitChange(active ? "" : opt.key)}
                  className={`h-auto justify-start p-2.5 rounded-lg border text-caption font-bold flex items-center gap-2 transition text-left ${
                    active
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/10"
                      : "border-border bg-bg text-text hover:border-primary/40 hover:bg-bg"
                  }`}
                >
                  <Icon size={16} />
                  <span>{opt.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. GHI CHÚ CHO QUẢN GIA / CHỦ NHÀ */}
      {showSpecialRequests && (
      <div>
        <label htmlFor={`${uid}-specialRequests`} className="block text-caption font-bold text-text mb-1">
          Yêu cầu đặc biệt cho Quản gia / Chủ nhà
        </label>
        <Textarea
          id={`${uid}-specialRequests`}
          rows={3}
          maxLength={500}
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder="VD: Gia đình có trẻ nhỏ cần kê thêm đệm phụ; cần mượn bếp nướng than BBQ ngoài trời; check-in muộn sau 20:00..."
          className={`${inputClassName} h-auto py-2 resize-none text-body-sm`}
        />
        <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1.5">
          <CheckCircle2 size={13} className="text-success shrink-0" />
          <span>Chủ nhà luôn hỗ trợ và chuẩn bị chu đáo trước giờ đón tiếp.</span>
        </div>
      </div>
      )}
    </div>
  )
}
