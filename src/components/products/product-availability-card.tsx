"use client"

import React, { useState } from "react"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Layers } from "@/components/ui/icon-set/layers"
import { Clock } from "@/components/ui/icon-set/clock"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Card } from "@/components/ui/card"
import { BlockedDatesEditor } from "./blocked-dates-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type AvailabilityMode,
  type AvailabilityConfig,
  type BookingCalendarConfig,
  type DailyCapacityConfig,
  type ScheduleSlotsConfig,
  parseAvailabilityConfig,
} from "@/modules/greeting-card/domain/product-availability-config"

interface ProductAvailabilityCardProps {
  productId: string
  initialConfig: unknown
  industryKey?: string | null
  canEdit: boolean
  onUpdated?: () => void
}

const MODES: Array<{ key: AvailabilityMode; label: string; desc: string; icon: React.ElementType }> = [
  {
    key: "STOCK_QUANTITY",
    label: "Tồn kho số lượng",
    desc: "Bán lẻ, Hoa, Thời trang — Bật/tắt hoặc theo số lượng có sẵn",
    icon: Layers,
  },
  {
    key: "BOOKING_CALENDAR",
    label: "Lịch đặt phòng / lưu trú",
    desc: "Homestay, Khách sạn — Kiểm tra khoảng ngày check-in / check-out",
    icon: Calendar,
  },
  {
    key: "DAILY_CAPACITY",
    label: "Giới hạn đơn / ngày",
    desc: "Quà tặng, Sản phẩm chế tác — Khống chế năng lực chế tác mỗi ngày",
    icon: ShieldCheck,
  },
  {
    key: "SCHEDULE_SLOTS",
    label: "Khung giờ phục vụ",
    desc: "Dịch vụ, Spa, Đặt bàn F&B — Đặt chỗ theo từng ca / slot",
    icon: Clock,
  },
]

export function ProductAvailabilityCard({
  productId,
  initialConfig,
  industryKey,
  canEdit,
  onUpdated,
}: ProductAvailabilityCardProps) {
  const [config, setConfig] = useState<AvailabilityConfig>(() =>
    parseAvailabilityConfig(initialConfig, industryKey)
  )
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability_config: config }),
      })
      if (!res.ok) {
        throw new Error(`Lưu thất bại (${res.status})`)
      }
      setSaveSuccess(true)
      onUpdated?.()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được cấu hình")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <span className="text-body font-bold text-text">Cơ chế Khả dụng & Đặt hàng</span>
        </div>
        <span className="text-caption px-2.5 py-0.5 rounded-full bg-surface-alt text-text-muted font-medium">
          Ngành: {industryKey || "Mặc định"}
        </span>
      </div>

      {/* Chọn mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {MODES.map((m) => {
          const Icon = m.icon
          const isSelected = config.mode === m.key
          return (
            <Button
              key={m.key}
              type="button"
              variant="outline"
              disabled={!canEdit || saving}
              onClick={() => {
                if (m.key === "BOOKING_CALENDAR") {
                  setConfig({ mode: "BOOKING_CALENDAR", minNights: 1, maxNights: 0, leadDays: 1, manualBlockedDates: [] })
                } else if (m.key === "DAILY_CAPACITY") {
                  setConfig({ mode: "DAILY_CAPACITY", maxOrdersPerDay: 5, closedWeekdays: [] })
                } else if (m.key === "SCHEDULE_SLOTS") {
                  setConfig({
                    mode: "SCHEDULE_SLOTS",
                    bookingLeadDays: 1,
                    slots: [
                      { id: "morning", label: "Buổi sáng 8:00–12:00", maxPerSlot: 3 },
                      { id: "afternoon", label: "Buổi chiều 13:00–17:00", maxPerSlot: 3 },
                    ],
                  })
                } else {
                  setConfig({ mode: "STOCK_QUANTITY", maxQuantity: null })
                }
              }}
              className={`p-3 h-auto rounded-xl border text-left transition flex flex-col items-start gap-1 justify-start ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-surface hover:bg-surface-alt/30"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-body-sm text-text">
                <Icon size={16} className={isSelected ? "text-primary" : "text-text-muted"} />
                <span>{m.label}</span>
              </div>
              <p className="text-caption text-text-muted leading-tight font-normal whitespace-normal">{m.desc}</p>
            </Button>
          )
        })}
      </div>

      {/* Cấu hình chi tiết cho BOOKING_CALENDAR */}
      {config.mode === "BOOKING_CALENDAR" && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-3">
          <div className="text-caption font-bold uppercase tracking-wider text-primary">
            Thiết lập Lịch Đặt phòng Homestay
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-bold text-text mb-1">Số đêm tối thiểu</label>
              <Input
                type="number"
                min={1}
                max={30}
                disabled={!canEdit || saving}
                value={(config as BookingCalendarConfig).minNights}
                onChange={(e) =>
                  setConfig({ ...config, minNights: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-full h-9 px-3 text-body-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-caption font-bold text-text mb-1">
                Đặt trước tối thiểu (ngày)
              </label>
              <Input
                type="number"
                min={0}
                max={30}
                disabled={!canEdit || saving}
                value={(config as BookingCalendarConfig).leadDays}
                onChange={(e) =>
                  setConfig({ ...config, leadDays: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full h-9 px-3 text-body-sm font-semibold"
              />
            </div>
          </div>

        </div>
      )}

      {/* Cấu hình chi tiết cho DAILY_CAPACITY */}
      {config.mode === "DAILY_CAPACITY" && (
        <div className="p-4 rounded-xl border border-border bg-surface-alt/30 flex flex-col gap-3">
          <div className="text-caption font-bold uppercase tracking-wider text-text">
            Khống chế Năng lực Chế tác Mỗi Ngày
          </div>
          <div>
            <label className="block text-caption font-bold text-text mb-1">
              Số đơn tối đa nhận trong 1 ngày
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              disabled={!canEdit || saving}
              value={(config as DailyCapacityConfig).maxOrdersPerDay}
              onChange={(e) =>
                setConfig({ ...config, maxOrdersPerDay: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className="w-full sm:w-48 h-9 px-3 text-body-sm font-semibold"
            />
            <span className="text-caption text-text-muted mt-1 block">
              Vượt quá số lượng này trong ngày, form sẽ báo kín đơn và đề xuất khách chuyển sang ngày khác.
            </span>
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-danger/10 text-danger text-caption flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saveSuccess && (
        <div role="status" className="p-3 rounded-lg bg-success/10 text-success text-caption flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>Đã lưu thành công cấu hình khả dụng!</span>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 h-9 px-4 font-bold text-caption rounded-lg bg-primary text-white"
          >
            {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={14} />}
            <span>{saving ? "Đang lưu..." : "Lưu cấu hình khả dụng"}</span>
          </Button>
        </div>
      )}
      <BlockedDatesEditor
        dates={config.manualBlockedDates ?? []}
        onChange={(dates) => setConfig({ ...config, manualBlockedDates: dates })}
        canEdit={canEdit}
        saving={saving}
        label={config.mode === "BOOKING_CALENDAR" ? "Ngày đóng cửa / bảo trì" : "Ngày không nhận đơn (hết nguyên liệu, nghỉ)"}
      />
    </Card>
  )
}
