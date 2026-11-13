"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { ViDateInput } from "@/components/greeting-card/customer/vi-date-input"
import { CalendarHeart, Loader2, Plus, Save, Trash2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  DEFAULT_HOLIDAY_MAX_ORDERS,
  HOLIDAY_NAME_MAX,
  HOLIDAY_SETTINGS_KEY,
  MAX_HOLIDAYS,
  MAX_HOLIDAY_SURCHARGE_VND,
  SUGGESTED_HOLIDAYS,
  isHolidayDate,
  parseHolidayPolicy,
  type HolidayDay,
} from "@/modules/greeting-card/domain/holiday-policy"

const FIELD = "h-10 px-3 rounded-lg border border-border bg-bg text-body text-text focus:outline-none focus:ring-2 focus:ring-primary/20"

interface Row { id: string; name: string; date: string; yearly: boolean; cutoff: string; maxOrders: string; surcharge: string }

const thisYear = () => new Date().getFullYear()

function toRow(h: HolidayDay): Row {
  const yearly = h.date.length === 5
  return {
    id: h.id, name: h.name, yearly, date: yearly ? `${thisYear()}-${h.date}` : h.date,
    cutoff: h.cutoffHour != null ? String(h.cutoffHour) : "",
    maxOrders: String(h.maxOrders), surcharge: h.surchargeVnd ? String(h.surchargeVnd) : "",
  }
}

const digits = (v: string) => Number(v.replace(/\D/g, ""))

/**
 * Ngày lễ (chính sách cửa hàng, `organizations.settings.brochure_holidays`): giờ chốt nhận đơn và số
 * đơn tối đa áp CẢ TIỆM (mặc định 500); phụ phí chỉ cộng ở bộ sưu tập bật "Áp dụng phụ phí ngày lễ".
 */
export function BrochureHolidaySettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<Row[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const rows = draft ?? (org.data ? parseHolidayPolicy(org.data.settings).map(toRow) : null)

  const edit = (next: Row[]) => {
    setDraft(next)
    setMessage(null)
  }
  const patch = (i: number, p: Partial<Row>) => rows && edit(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const add = (name = "", mmdd = "") =>
    rows && rows.length < MAX_HOLIDAYS &&
    edit([...rows, { id: `h${Date.now().toString(36)}`, name, date: mmdd ? `${thisYear()}-${mmdd}` : "", yearly: !!mmdd, cutoff: "", maxOrders: String(DEFAULT_HOLIDAY_MAX_ORDERS), surcharge: "" }])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!rows) return
    const days = rows
      .filter((r) => r.name.trim() && r.date)
      .map((r) => ({
        id: r.id,
        name: r.name.trim().slice(0, HOLIDAY_NAME_MAX),
        date: r.yearly ? r.date.slice(5) : r.date,
        ...(r.cutoff.trim() && digits(r.cutoff) >= 1 && digits(r.cutoff) <= 23 ? { cutoff_hour: digits(r.cutoff) } : {}),
        max_orders: digits(r.maxOrders) >= 1 ? digits(r.maxOrders) : DEFAULT_HOLIDAY_MAX_ORDERS,
        surcharge_vnd: Math.min(digits(r.surcharge) || 0, MAX_HOLIDAY_SURCHARGE_VND),
      }))
    if (days.some((d) => !isHolidayDate(d.date))) {
      setMessage({ ok: false, text: "Có ngày lễ chưa chọn ngày hợp lệ." })
      return
    }
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [HOLIDAY_SETTINGS_KEY]: { days } } }, "Không lưu được ngày lễ")
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: `Đã lưu ${days.length} ngày lễ.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được ngày lễ" })
    } finally {
      setSaving(false)
    }
  }

  const missing = rows ? SUGGESTED_HOLIDAYS.filter((s) => !rows.some((r) => r.yearly && r.date.slice(5) === s.date)) : []

  return (
    <form onSubmit={save} className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CalendarHeart size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Ngày lễ</h3>
      </div>
      <p className="text-caption text-text-muted">
        Giờ chốt nhận đơn và số đơn tối đa mỗi ngày lễ áp cho cả tiệm (mặc định {DEFAULT_HOLIDAY_MAX_ORDERS} đơn). Phụ phí chỉ cộng ở bộ sưu tập bật &ldquo;Áp dụng phụ phí ngày lễ&rdquo;.
      </p>

      {org.error ? (
        <p role="alert" className="text-body-sm text-danger">{org.error.message}</p>
      ) : !rows ? (
        <SkeletonBlock lines={2} label="Đang tải ngày lễ" />
      ) : (
        <>
          {rows.length === 0 && <p className="text-body-sm text-text-muted">Chưa khai ngày lễ nào — mọi ngày nhận đơn như ngày thường.</p>}
          <ul className="flex flex-col gap-3">
            {rows.map((r, i) => (
              <li key={r.id} className="rounded-xl border border-border p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Input aria-label="Tên ngày lễ" value={r.name} maxLength={HOLIDAY_NAME_MAX} placeholder="VD: Valentine" onChange={(e) => patch(i, { name: e.target.value })} className={`${FIELD} flex-1 min-w-40`} />
                  <ViDateInput compact ariaLabel="Ngày" value={r.date} onChange={(date) => patch(i, { date })} wrapperClassName="w-44" className={FIELD} />
                  <label className="flex items-center gap-1.5 text-body-sm text-text">
                    <Checkbox checked={r.yearly} onCheckedChange={(checked) => patch(i, { yearly: (checked === true) })} /> Lặp lại hằng năm
                  </label>
                  <Button variant="ghost" type="button" aria-label={`Xoá ${r.name || "ngày lễ"}`} onClick={() => edit(rows.filter((_, j) => j !== i))} className="text-[length:inherit] h-auto font-[inherit] gap-0 ml-auto p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg">
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-body-sm">
                  <label className="flex items-center gap-2"><span className="text-text-muted">Chốt đơn giao trong ngày lúc</span>
                    <Input inputMode="numeric" value={r.cutoff} placeholder="VD: 12" onChange={(e) => patch(i, { cutoff: e.target.value })} className={`${FIELD} w-16`} />
                    <span className="text-text-muted">giờ</span></label>
                  <label className="flex items-center gap-2"><span className="text-text-muted">Tối đa</span>
                    <Input inputMode="numeric" value={r.maxOrders} onChange={(e) => patch(i, { maxOrders: e.target.value })} className={`${FIELD} w-24`} />
                    <span className="text-text-muted">đơn</span></label>
                  <label className="flex items-center gap-2"><span className="text-text-muted">Phụ phí</span>
                    <Input inputMode="numeric" value={r.surcharge} placeholder="0" onChange={(e) => patch(i, { surcharge: e.target.value })} className={`${FIELD} w-32`} />
                    <span className="text-text-muted">đ</span></label>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => add()} className="gap-1.5"><Plus size={14} /> Thêm ngày lễ</Button>
            {missing.map((s) => (
              <Button key={s.date} type="button" variant="ghost" size="sm" onClick={() => add(s.name, s.date)} className="gap-1.5 text-text-muted">
                <Plus size={14} /> {s.name}
              </Button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? "Tết âm lịch đổi ngày mỗi năm: thêm từng ngày cụ thể, bỏ chọn “Lặp lại hằng năm”."}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu ngày lễ</span>
        </Button>
      </div>
    </form>
  )
}
