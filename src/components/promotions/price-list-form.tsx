"use client"

import { useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"

import { ActiveSwitch } from "@/components/promotions/active-switch"
import { Button } from "@/components/ui/button"
import { Disclosure } from "@/components/ui/disclosure"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface PriceListFormValue {
  id?: string | undefined
  name: string
  heading: string
  note: string
  categories: string[]
  validFrom: string | null
  validTo: string | null
  showPeakPrice: boolean
  showPromotions: boolean
  active: boolean
}

const FIELD = "flex flex-col gap-1.5 text-body-sm font-semibold text-text"

export const EMPTY_PRICE_LIST: PriceListFormValue = {
  name: "", heading: "", note: "", categories: [], validFrom: null, validTo: null, showPeakPrice: true, showPromotions: true, active: true,
}

/** Tạo/sửa bảng giá. Giá lấy thẳng từ sản phẩm nên ở đây chỉ chọn phạm vi và cách trình bày. */
export function PriceListForm({
  initial,
  categories,
  onSaved,
  onCancel,
}: {
  initial: PriceListFormValue
  categories: Array<{ value: string; label: string }>
  onSaved: (id: string) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<PriceListFormValue>(initial)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof PriceListFormValue>(k: K, value: PriceListFormValue[K]) => setV((x) => ({ ...x, [k]: value }))
  const toggleCategory = (c: string) => set("categories", v.categories.includes(c) ? v.categories.filter((x) => x !== c) : [...v.categories, c])

  async function submit() {
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(v.id ? `/api/v1/price-lists/${v.id}` : "/api/v1/price-lists", {
        method: v.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          heading: v.heading,
          note: v.note,
          categories: v.categories,
          product_ids: null,
          valid_from: v.validFrom || null,
          valid_to: v.validTo || null,
          show_peak_price: v.showPeakPrice,
          show_promotions: v.showPromotions,
          active: v.active,
        }),
      })
      const body = await res.json().catch(() => null)
      if (res.ok) return onSaved(body.id)
      const details = body?.error?.details as Record<string, unknown> | undefined
      const fieldErrors = Object.fromEntries(Object.entries(details ?? {}).filter(([, x]) => typeof x === "string")) as Record<string, string>
      setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { form: body?.error?.message ?? "Chưa lưu được, vui lòng thử lại" })
    } catch {
      setErrors({ form: "Mất kết nối, vui lòng thử lại" })
    } finally {
      setSaving(false)
    }
  }

  const err = (k: string) => errors[k] && <span className="text-meta font-normal text-danger-text">{errors[k]}</span>

  return (
    <div className="flex flex-col gap-4">
      <label className={FIELD}>
        Tên bảng giá
        <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ví dụ: Bảng giá hoa Tết 2027" hasError={!!errors.name} />
        {err("name")}
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-body-sm font-semibold text-text">Sản phẩm đưa vào</legend>
        {categories.length === 0 ? (
          <p className="text-body-sm text-text-muted">Bảng giá gồm mọi sản phẩm đang bán.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={v.categories.length === 0}
              onClick={() => set("categories", [])}
              className={`min-h-9 h-auto rounded-full border px-3 text-body-sm ${v.categories.length === 0 ? "border-primary bg-primary-muted text-primary" : "border-border bg-surface text-text"}`}
            >
              Tất cả
            </Button>
            {categories.map((c) => (
              <Button
                key={c.value}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={v.categories.includes(c.value)}
                onClick={() => toggleCategory(c.value)}
                className={`min-h-9 h-auto rounded-full border px-3 text-body-sm ${v.categories.includes(c.value) ? "border-primary bg-primary-muted text-primary" : "border-border bg-surface text-text"}`}
              >
                {c.label}
              </Button>
            ))}
          </div>
        )}
        <span className="text-meta text-text-muted">Giá lấy từ Quản lý sản phẩm — sửa giá sản phẩm là bảng giá tự cập nhật.</span>
      </fieldset>

      <Disclosure label="Trình bày và thời gian áp dụng" appliedSummary={v.validFrom || v.validTo ? "Có thời hạn" : "Không thời hạn"}>
        <div className="flex flex-col gap-3">
          <label className={FIELD}>
            Tiêu đề in trên bảng giá
            <Input value={v.heading} onChange={(e) => set("heading", e.target.value)} placeholder={v.name || "Dùng tên bảng giá"} />
          </label>
          <label className={FIELD}>
            Ghi chú cuối bảng
            <Textarea
              value={v.note}
              onChange={(e) => set("note", e.target.value)}
              rows={3}
              maxLength={1000}
              className="text-body"
              placeholder="Ví dụ: Giá đã gồm VAT, chưa gồm phí giao hàng"
            />
            {err("note")}
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={FIELD}>
              Áp dụng từ ngày
              <Input type="date" value={v.validFrom ?? ""} onChange={(e) => set("validFrom", e.target.value || null)} />
            </label>
            <label className={FIELD}>
              Đến ngày
              <Input type="date" value={v.validTo ?? ""} onChange={(e) => set("validTo", e.target.value || null)} hasError={!!errors.validTo} />
              {err("validTo")}
            </label>
          </div>
          {([["showPeakPrice", "Hiện giá ngày cao điểm"], ["showPromotions", "In kèm ưu đãi đang bật"]] as const).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-body text-text">{label}</span>
              <ActiveSwitch checked={v[k]} onChange={(next) => set(k, next)} label={label} />
            </div>
          ))}
        </div>
      </Disclosure>

      {errors.form && <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-body-sm text-danger-text">{errors.form}</p>}

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Huỷ</Button>
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Lưu bảng giá
        </Button>
      </div>
    </div>
  )
}
