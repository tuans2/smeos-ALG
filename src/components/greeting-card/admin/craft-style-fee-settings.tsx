"use client"

import React, { useState } from "react"

import { Hammer } from "@/components/ui/icon-set/hammer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { useSession } from "@/lib/session"
import {
  CRAFT_HOLIDAY_MULTIPLIER_KEY, CRAFT_STYLE_FEES_KEY, MAX_HOLIDAY_MULTIPLIER, MIN_HOLIDAY_MULTIPLIER,
  resolveCraftStyles, resolveHolidayMultiplier,
} from "@/modules/greeting-card/domain/craft-style-fee"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

const digits = (v: string) => Number(v.replace(/\D/g, ""))

/**
 * Phí chế tác theo kiểu dáng (PO Q8, checklist ALG 3.6): đơn giá đã gồm trong giá mẫu; ngày lễ cửa hàng khai,
 * khách trả thêm phần phí × (hệ số − 1). Lưu ở `organizations.settings`.
 */
export function CraftStyleFeeSettings() {
  const { organization } = useSession()
  const spec = getIndustryPlugin(organization?.industry).craftFee
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [fees, setFees] = useState<Record<string, string> | null>(null)
  const [multiplier, setMultiplier] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  if (!spec?.styles || spec.styles.length === 0) return null

  const saved = org.data ? resolveCraftStyles(spec.styles, org.data.settings) : null
  const shownFees = fees ?? (saved ? Object.fromEntries(saved.map((s) => [s.key, String(s.feeVnd)])) : null)
  const shownMultiplier = multiplier ?? (org.data ? String(resolveHolidayMultiplier(spec.holidayMultiplier, org.data.settings)).replace(".", ",") : "")

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!shownFees) return
    const m = Number(shownMultiplier.replace(",", "."))
    if (!Number.isFinite(m) || m < MIN_HOLIDAY_MULTIPLIER || m > MAX_HOLIDAY_MULTIPLIER) {
      setMessage({ ok: false, text: `Hệ số ngày lễ từ ${MIN_HOLIDAY_MULTIPLIER} đến ${MAX_HOLIDAY_MULTIPLIER}` })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", {
        settings: { [CRAFT_STYLE_FEES_KEY]: Object.fromEntries(Object.entries(shownFees).map(([k, v]) => [k, digits(v)])), [CRAFT_HOLIDAY_MULTIPLIER_KEY]: m },
      }, "Không lưu được phí chế tác")
      setMessage({ ok: true, text: "Đã lưu phí chế tác theo kiểu dáng" })
      setFees(null)
      setMultiplier(null)
      await org.mutate()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được phí chế tác" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 text-title-sm font-bold text-text"><Hammer size={18} />{spec.feeLabel} theo kiểu dáng</h3>
      <p className="mt-1 text-caption text-text-muted">
        Đơn giá đã gồm trong giá mẫu. Ngày lễ, khách trả thêm phần {spec.feeLabel.toLowerCase()} × (hệ số − 1), gộp vào giá; sổ nội bộ ghi tách.
      </p>
      {!shownFees ? (
        <SkeletonBlock lines={3} label="Đang tải phí chế tác" />
      ) : (
        <form onSubmit={save} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {spec.styles.map((s) => (
              <label key={s.key} className="flex items-center justify-between gap-2 text-body-sm text-text">
                <span>{s.label}</span>
                <Input inputMode="numeric" value={shownFees[s.key] ?? ""} onChange={(e) => setFees({ ...shownFees, [s.key]: e.target.value })} className="h-9 w-36 text-right" aria-label={`Đơn giá ${s.label}`} />
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-body-sm text-text">
            Hệ số ngày lễ
            <Input inputMode="decimal" value={shownMultiplier} onChange={(e) => setMultiplier(e.target.value)} className="h-9 w-24" aria-label="Hệ số ngày lễ" />
          </label>
          {message && <p role="status" className={message.ok ? "text-caption text-success" : "text-caption text-danger"}>{message.text}</p>}
          <Button type="submit" size="sm" variant="secondary" disabled={saving} className="self-end">{saving ? "Đang lưu…" : "Lưu phí chế tác"}</Button>
        </form>
      )}
    </section>
  )
}
