"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { BadgePercent } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { DISCOUNT_SETTINGS_KEY, parseMaxDiscountPercent } from "@/modules/greeting-card/domain/discount-request"
import { PLATFORM_MAX_DISCOUNT_PERCENT } from "@/modules/organization/domain/governance-decisions"

/** Mức giảm giá tối đa sale được xin và Điều hành được duyệt cho một đơn (mặc định và tối đa 50% — trần chung, PO 07/11/2026). */
export function BrochureDiscountSettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [edited, setEdited] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const current = org.data ? parseMaxDiscountPercent(org.data.settings) : null
  const value = edited ?? (current !== null ? String(current) : "")

  async function save() {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > PLATFORM_MAX_DISCOUNT_PERCENT) {
      setMessage({ ok: false, text: `Nhập số nguyên từ 0 đến ${PLATFORM_MAX_DISCOUNT_PERCENT}` })
      return
    }
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [DISCOUNT_SETTINGS_KEY]: { max_percent: n } } }, "Không lưu được mức giảm tối đa")
      await org.mutate()
      setEdited(null)
      setMessage({ ok: true, text: n === 0 ? "Đã tắt xin giảm giá." : `Đã lưu: tối đa ${n}% mỗi đơn.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được mức giảm tối đa" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BadgePercent size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Giảm giá tối đa mỗi đơn</h3>
      </div>
      <p className="text-caption text-text-muted">Sale chỉ xin được và Điều hành chỉ duyệt được trong mức này. Đặt 0 để tắt xin giảm giá.</p>
      <div className="flex items-center gap-2">
        <label htmlFor="max-discount" className="sr-only">Phần trăm giảm tối đa</label>
        <Input id="max-discount" type="number" inputMode="numeric" min={0} max={PLATFORM_MAX_DISCOUNT_PERCENT} value={value}
          onChange={(e) => { setEdited(e.target.value); setMessage(null) }}
          className="h-11 w-24 rounded-xl border border-border bg-surface px-3 text-right text-body text-text" />
        <span className="text-body-sm text-text-muted">%</span>
        <Button variant="primary" type="button" onClick={() => void save()} disabled={saving || edited === null}
          className="py-0 gap-0 ml-auto h-11 rounded-xl bg-primary px-4 text-body-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      {message && <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>}
    </section>
  )
}
