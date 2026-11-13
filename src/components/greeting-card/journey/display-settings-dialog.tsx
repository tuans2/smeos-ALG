"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Lock } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { InlineError } from "@/components/ui/inline-error"
import { useI18n } from "@/lib/i18n"
import {
  OPTIONAL_DISPLAY_FIELDS,
  getOptionalDisplayFields,
  enabledFieldsFor,
  type DisplaySettings,
  type OptionalDisplayField,
} from "@/modules/greeting-card/domain/display-fields"
import { GREETING_TEMPLATES, type GreetingTemplateId } from "@/modules/greeting-card/domain/greeting-template-registry"
import { DEFAULT_PRICE_VISIBILITY, type PriceVisibility } from "@/modules/greeting-card/domain/price-visibility"
import { DEFAULT_THANK_YOU_POLICY, type ThankYouPolicy } from "@/modules/greeting-card/domain/thank-you-voucher"

const API = "/api/v1/greeting-card/display-settings"

type SettingsResponse = { data?: { settings?: DisplaySettings; pricing?: PriceVisibility; thankYou?: ThankYouPolicy } }
/** Phần cài đặt dùng chung cả cửa hàng lưu cùng nút "Lưu cài đặt" */
export type ShopDisplayOptions = { pricing: PriceVisibility; thankYou: ThankYouPolicy }

/** Cấu hình hiển thị của cửa hàng: tải một lần, lưu trường theo từng mẫu cùng công tắc giá/giảm giá. */
export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>({})
  const [shop, setShop] = useState<ShopDisplayOptions>({ pricing: DEFAULT_PRICE_VISIBILITY, thankYou: DEFAULT_THANK_YOU_POLICY })
  useEffect(() => {
    let cancelled = false
    fetch(API)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SettingsResponse | null) => {
        if (cancelled) return
        if (j?.data?.settings) setSettings(j.data.settings)
        if (j?.data?.pricing && j.data.thankYou) setShop({ pricing: j.data.pricing, thankYou: j.data.thankYou })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const save = useCallback(async (templateId: string, fields: OptionalDisplayField[], next: ShopDisplayOptions) => {
    const res = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId, fields, pricing: next.pricing, thank_you: { enabled: next.thankYou.enabled, percent: next.thankYou.percent } }),
    })
    if (!res.ok) throw new Error("Không lưu được cài đặt hiển thị. Vui lòng thử lại.")
    const j = (await res.json()) as { data: { settings: DisplaySettings; pricing: PriceVisibility; thankYou: ThankYouPolicy } }
    setSettings(j.data.settings)
    setShop({ pricing: j.data.pricing, thankYou: j.data.thankYou })
  }, [])
  return { settings, shop, save }
}

const REQUIRED = ["Mã mẫu", "Tên sản phẩm"]

function SwitchRow({ id, label, hint, on, onToggle }: { id: string; label: string; hint?: string | undefined; on: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-body-sm">
      <label htmlFor={id} className="flex flex-col">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-caption text-text-muted">{hint}</span>}
      </label>
      <Button variant="ghost"
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`px-0 py-0 text-[length:inherit] font-[inherit] gap-0 relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary hover:bg-primary" : "bg-border hover:bg-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
      </Button>
    </li>
  )
}

interface DisplaySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: GreetingTemplateId
  settings: DisplaySettings
  shop: ShopDisplayOptions
  onSave: (templateId: string, fields: OptionalDisplayField[], shop: ShopDisplayOptions) => Promise<void>
}

/** Bật/tắt từng trường thông tin sản phẩm cho một mẫu Thẻ chào (áp dụng cho cả cửa hàng). */
export function DisplaySettingsDialog({ open, onOpenChange, templateId, settings, shop, onSave }: DisplaySettingsDialogProps) {
  const [fields, setFields] = useState<OptionalDisplayField[]>(() => enabledFieldsFor(settings, templateId))
  const [price, setPrice] = useState<PriceVisibility>(shop.pricing)
  const [thankYou, setThankYou] = useState<ThankYouPolicy>(shop.thankYou)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: OptionalDisplayField) {
    setFields((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(templateId, fields, { pricing: price, thankYou })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được.")
    } finally {
      setSaving(false)
    }
  }

  const { industry } = useI18n()
  const displayFields = getOptionalDisplayFields(industry?.identity?.key)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      title={`Thông tin hiển thị · ${GREETING_TEMPLATES[templateId]?.name ?? templateId}`}
      description="Áp dụng cho mọi bộ sưu tập của cửa hàng đang dùng mẫu này. Trường sản phẩm chưa có dữ liệu sẽ tự ẩn."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 size={16} className="mr-1.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            Lưu cài đặt
          </Button>
        </div>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {REQUIRED.map((label) => (
          <li key={label} className="flex items-center justify-between py-3 text-body-sm">
            <span className="font-medium">{label}</span>
            <span className="inline-flex items-center gap-1 text-caption text-text-muted">
              <Lock size={12} aria-hidden="true" /> Luôn hiển thị
            </span>
          </li>
        ))}
        {displayFields.map((f) => (
          <SwitchRow key={f.key} id={`df-${f.key}`} label={f.label} on={fields.includes(f.key)} onToggle={() => toggle(f.key)} />
        ))}
      </ul>
      <p className="mt-4 text-caption font-semibold text-text-muted">Giá và ưu đãi · áp dụng cho mọi mẫu của cửa hàng</p>
      <ul className="flex flex-col divide-y divide-border">
        <SwitchRow
          id="df-price"
          label="Giá tiền"
          hint={price.hidePrice ? "Khách thấy \"Liên hệ báo giá\", vẫn đặt được; cửa hàng báo giá trước khi thu tiền" : undefined}
          on={!price.hidePrice}
          onToggle={() => setPrice((p) => ({ ...p, hidePrice: !p.hidePrice }))}
        />
        <SwitchRow
          id="df-discounts"
          label="Thông tin giảm giá"
          hint="Danh sách ưu đãi và băng rôn ưu đãi trên trang khách"
          on={price.showDiscounts}
          onToggle={() => setPrice((p) => ({ ...p, showDiscounts: !p.showDiscounts }))}
        />
        <SwitchRow
          id="df-thank-you"
          label="Mã cảm ơn sau đơn hoàn tất"
          hint="Khách nhận một mã giảm giá dùng một lần cho lần đặt sau"
          on={thankYou.enabled}
          onToggle={() => setThankYou((t) => ({ ...t, enabled: !t.enabled }))}
        />
        {thankYou.enabled && (
          <li className="flex items-center justify-between gap-3 py-3 text-body-sm">
            <label htmlFor="df-thank-you-percent" className="font-medium">Mức giảm (%)</label>
            <Input
              id="df-thank-you-percent"
              type="number"
              min={1}
              max={100}
              value={thankYou.percent}
              onChange={(e) => setThankYou((t) => ({ ...t, percent: Math.min(100, Math.max(1, Math.round(Number(e.target.value) || 1))) }))}
              className="h-9 w-20 rounded-md border border-border bg-surface px-2 text-right text-body-sm"
            />
          </li>
        )}
      </ul>
      {error && <InlineError message={error} className="mt-3" />}
    </Dialog>
  )
}
