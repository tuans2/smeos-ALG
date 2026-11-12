"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BadgePercent } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { useSession } from "@/lib/session"
import { ORDER_DISCOUNT_SETTINGS_KEY, parseSaleMaxDiscountPercent } from "@/modules/sales/domain/quotation-discount"
import { PLATFORM_MAX_DISCOUNT_PERCENT } from "@/modules/organization/domain/governance-decisions"

/**
 * Mức giảm giá Sale được tự quyết trên báo giá (PO 12/11/2026, audit BL-28). Vượt mức này thì Điều hành lưu báo giá;
 * không ai giảm quá trần nền tảng 50% tiền hàng. Chỉ người sửa được cài đặt tiệm (F2) đổi được.
 */
export function QuotationDiscountSettingsCard() {
  const { can } = useSession()
  const canEdit = can("F2")
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [edited, setEdited] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const current = org.data ? parseSaleMaxDiscountPercent(org.data.settings) : null
  const value = edited ?? (current !== null ? String(current) : "")

  async function save() {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > PLATFORM_MAX_DISCOUNT_PERCENT) {
      setMessage({ ok: false, text: `Nhập số nguyên từ 0 đến ${PLATFORM_MAX_DISCOUNT_PERCENT}` })
      return
    }
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [ORDER_DISCOUNT_SETTINGS_KEY]: { sale_max_percent: n } } }, "Không lưu được mức giảm")
      await org.mutate()
      setEdited(null)
      setMessage({ ok: true, text: `Đã lưu: Sale tự quyết giảm tối đa ${n}% tiền hàng.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được mức giảm" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BadgePercent size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Giảm giá Sale được tự quyết trên báo giá</h3>
      </div>
      <p className="text-caption text-text-muted">
        Vượt mức này thì Điều hành lưu báo giá. Không ai giảm quá {PLATFORM_MAX_DISCOUNT_PERCENT}% tiền hàng.
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="sale-max-discount" className="sr-only">Phần trăm Sale được tự quyết</label>
        <Input id="sale-max-discount" type="number" inputMode="numeric" min={0} max={PLATFORM_MAX_DISCOUNT_PERCENT} value={value} disabled={!canEdit}
          onChange={(e) => { setEdited(e.target.value); setMessage(null) }}
          className="h-11 w-24 rounded-xl border border-border bg-surface px-3 text-right text-body text-text" />
        <span className="text-body-sm text-text-muted">%</span>
        {canEdit && (
          <Button variant="primary" type="button" onClick={() => void save()} disabled={saving || edited === null} className="ml-auto h-11">
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        )}
      </div>
      {message && <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>}
    </section>
  )
}
