"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Loader2, Plus, Save, Trash2, Truck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  BROCHURE_SHIPPING_SETTINGS_KEY,
  parseShippingConfig,
  type ShippingConfig,
} from "@/modules/greeting-card/domain/brochure-pricing"
import { enabledSlots, customTimeAllowed } from "@/modules/greeting-card/domain/delivery-schedule"
import { DeliverySlotToggles } from "./delivery-slot-toggles"
import { MAX_REDELIVERY_FEE_VND, parseRedeliveryFee } from "@/modules/greeting-card/domain/delivery-failure"
import { SlotCapacityFields, type SlotCapacityDraft } from "./slot-capacity-fields"
import { DEFAULT_SLOT_CAPACITY, MAX_SLOT_CAPACITY } from "@/modules/greeting-card/domain/slot-capacity"

interface ZoneDraft {
  id: string
  name: string
  fee: string
}

const FIELD = "h-10 px-3 rounded-lg border border-border bg-bg text-body text-text focus:outline-none focus:ring-2 focus:ring-primary/20"

type Draft = {
  zones: ZoneDraft[]; freeOver: string; cutoff: string; prep: string; slotIds: string[]; allowCustomTime: boolean
  freeAll: boolean; vouchers: boolean; capacity: SlotCapacityDraft; redelivery: string
}

function toDraft(config: ShippingConfig, redeliveryFeeVnd: number): Draft {
  return {
    redelivery: redeliveryFeeVnd ? String(redeliveryFeeVnd) : "",
    zones: config.zones.map((z) => ({ id: z.id, name: z.name, fee: String(z.feeVnd) })),
    freeOver: config.freeShippingOverVnd ? String(config.freeShippingOverVnd) : "",
    cutoff: config.sameDayCutoffHour != null ? String(config.sameDayCutoffHour) : "",
    prep: config.prepHours != null ? String(config.prepHours) : "2",
    slotIds: enabledSlots(config).map((s) => s.id),
    allowCustomTime: customTimeAllowed(config),
    freeAll: config.freeShippingAll === true,
    vouchers: config.vouchersEnabled === true,
    capacity: {
      all: String(config.slotCapacity?.defaultMax ?? DEFAULT_SLOT_CAPACITY),
      perSlot: Object.fromEntries(Object.entries(config.slotCapacity?.perSlot ?? {}).map(([k, v]) => [k, String(v)])),
    },
  }
}

/** "" → null; số nguyên 0…10.000 (máy chủ cũng bỏ giá trị lạ). */
function capOrNull(v: string): number | null {
  const n = Number(v.replace(/\D/g, ""))
  return v.trim() && Number.isInteger(n) && n >= 0 && n <= MAX_SLOT_CAPACITY ? n : null
}

/** "" → null; ngoài khoảng → null (máy chủ cũng bỏ giá trị lạ). */
function hourOrNull(v: string, min: number, max: number): number | null {
  const n = Number(v.replace(/\D/g, ""))
  return v.trim() && Number.isInteger(n) && n >= min && n <= max ? n : null
}

/** "" → null; số thập phân min…max (vd: 1.5, 2; chấp nhận cả dấu phẩy). */
function decimalOrNull(v: string, min: number, max: number): number | null {
  const trimmed = v.trim().replace(",", ".")
  const n = Number(trimmed)
  return trimmed && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null
}

/**
 * Khu vực giao + phí giao cho đơn Thẻ chào (`organizations.settings.brochure_shipping`).
 * Không khai khu vực nào → form khách không hỏi khu vực, phí giao "cửa hàng báo sau".
 */
export function BrochureShippingSettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Bản nháp khởi tạo từ dữ liệu đã lưu ở lần sửa đầu tiên — không cần effect đồng bộ.
  const current = draft ?? (org.data ? toDraft(parseShippingConfig(org.data.settings), parseRedeliveryFee(org.data.settings)) : null)
  const edit = (next: Draft) => {
    setDraft(next)
    setMessage(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!current) return
    if (current.slotIds.length === 0 && !current.allowCustomTime) {
      setMessage({ ok: false, text: "Cần bật ít nhất một khung giờ giao hoặc cho nhập giờ cụ thể." })
      return
    }
    const zones = current.zones
      .map((z) => ({ id: z.id, name: z.name.trim(), fee_vnd: Number(z.fee.replace(/\D/g, "")) }))
      .filter((z) => z.name)
    const payload = {
      [BROCHURE_SHIPPING_SETTINGS_KEY]: {
        zones,
        free_shipping_over_vnd: current.freeOver ? Number(current.freeOver.replace(/\D/g, "")) : null,
        same_day_cutoff_hour: hourOrNull(current.cutoff, 1, 23),
        prep_hours: decimalOrNull(current.prep, 0, 24) ?? 2,
        delivery_slots: current.slotIds,
        allow_custom_time: current.allowCustomTime,
        free_shipping_all: current.freeAll,
        voucher_enabled: current.vouchers,
        slot_capacity: {
          default: capOrNull(current.capacity.all) ?? DEFAULT_SLOT_CAPACITY,
          per_slot: Object.fromEntries(
            Object.entries(current.capacity.perSlot).flatMap(([k, v]) => (capOrNull(v) === null ? [] : [[k, capOrNull(v)]]))
          ),
        },
        // Phí khi giao không thành công phải giao lại (0 = không thu)
        redelivery_fee_vnd: Math.min(Number(current.redelivery.replace(/\D/g, "")) || 0, MAX_REDELIVERY_FEE_VND),
      },
    }
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: payload }, "Không lưu được phí giao hàng")
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: `Đã lưu ${zones.length} khu vực giao hàng.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được phí giao hàng" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Truck size={18} className="text-primary" />
        <h3 className="text-title-sm font-extrabold text-text">Khu vực, phí giao & giờ nhận đơn</h3>
      </div>

      {org.error ? (
        <p role="alert" className="text-body-sm text-danger">{org.error.message}</p>
      ) : !current ? (
        <div className="h-20 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {current.zones.length === 0 && (
              <li className="text-body-sm text-text-muted">Chưa khai khu vực — khách sẽ thấy “phí giao cửa hàng báo sau”.</li>
            )}
            {current.zones.map((z, i) => (
              <li key={z.id} className="flex gap-2 items-center">
                <Input
                  aria-label="Tên khu vực"
                  value={z.name}
                  maxLength={80}
                  placeholder="VD: Nội thành Quận 1, 3, 5"
                  onChange={(e) => edit({ ...current, zones: current.zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  className={`${FIELD} flex-1`}
                />
                <Input
                  aria-label="Phí giao (đ)"
                  inputMode="numeric"
                  value={z.fee}
                  placeholder="Phí (đ)"
                  onChange={(e) => edit({ ...current, zones: current.zones.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)) })}
                  className={`${FIELD} w-32`}
                />
                <Button variant="outline"
                  type="button"
                  aria-label={`Xoá khu vực ${z.name || i + 1}`}
                  onClick={() => edit({ ...current, zones: current.zones.filter((_, j) => j !== i) })}
                  className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 h-10 w-10 rounded-lg border border-border text-danger flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => edit({ ...current, zones: [...current.zones, { id: `z${Date.now().toString(36)}`, name: "", fee: "" }] })}
              className="gap-1.5"
            >
              <Plus size={14} /> Thêm khu vực
            </Button>
            <label className="flex items-center gap-2 text-body-sm">
              <span className="text-text-muted">Miễn phí giao cho đơn từ</span>
              <Input
                inputMode="numeric"
                value={current.freeOver}
                placeholder="Bỏ trống = không miễn"
                onChange={(e) => edit({ ...current, freeOver: e.target.value })}
                className={`${FIELD} w-44`}
              />
              <span className="text-text-muted">đ</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <label className="flex items-center gap-2 text-body-sm">
              <span className="text-text-muted">Nhận giao trong ngày đến</span>
              <Input
                inputMode="numeric"
                value={current.cutoff}
                placeholder="VD: 16"
                onChange={(e) => edit({ ...current, cutoff: e.target.value })}
                className={`${FIELD} w-20`}
              />
              <span className="text-text-muted">giờ (bỏ trống = không giới hạn)</span>
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <span className="text-text-muted">Chuẩn bị tối thiểu</span>
              <Input
                inputMode="decimal"
                value={current.prep}
                placeholder="2"
                onChange={(e) => edit({ ...current, prep: e.target.value })}
                className={`${FIELD} w-16 text-center`}
              />
              <span className="text-text-muted">giờ trước khi giao (mặc định 2h)</span>
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <span className="text-text-muted">Phí giao lại khi giao không thành công</span>
              <Input
                inputMode="numeric"
                value={current.redelivery}
                placeholder="Bỏ trống = không thu"
                onChange={(e) => edit({ ...current, redelivery: e.target.value })}
                className={`${FIELD} w-40`}
              />
              <span className="text-text-muted">đ</span>
            </label>
            <p className="w-full text-caption text-text-muted mt-1">
              Khung giờ khách chọn sẽ cách thời điểm đặt ít nhất bằng thời gian chuẩn bị (làm tròn lên mốc 30 phút). VD: khách đặt lúc 11:35 thì khung sớm nhất là 14:00 - 16:00.
            </p>
          </div>
          <DeliverySlotToggles
            slotIds={current.slotIds}
            allowCustomTime={current.allowCustomTime}
            onChange={(next) => edit({ ...current, ...next })}
          />
          <SlotCapacityFields value={current.capacity} onChange={(capacity) => edit({ ...current, capacity })} />
          <div className="flex flex-col gap-2 border-t border-border pt-3 text-body-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={current.freeAll} onCheckedChange={(checked) => edit({ ...current, freeAll: (checked === true) })} className="accent-primary" />
              <span><strong>Miễn phí giao hàng cho mọi đơn</strong> (khách không trả phí giao ở mọi khu vực)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={current.vouchers} onCheckedChange={(checked) => edit({ ...current, vouchers: (checked === true) })} className="accent-primary" />
              <span>Cho khách nhập <strong>mã giảm giá</strong> (tắt = ẩn ô nhập mã)</span>
            </label>
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? "Phí giao được cộng vào tổng tiền và mã QR thanh toán của khách."}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu phí giao</span>
        </Button>
      </div>
    </form>
  )
}
