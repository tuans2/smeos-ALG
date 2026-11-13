"use client"

import React from "react"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"
import { withDimensions, type PriceMode, type ProductPricing } from "@/modules/products/domain/product-pricing"
import { formatVndInput, parseVndInput } from "./pricing-form"
import { MoneyInput } from "./money-input"
import { PricingDimensionsPicker } from "./pricing-dimensions-picker"
import { PricingVariantTable } from "./pricing-variant-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

const MODES: Array<{ key: PriceMode; label: string; hint: string }> = [
  { key: "FIXED", label: "Giá xác định", hint: "Một mức giá cho sản phẩm" },
  { key: "RANGE", label: "Khoảng giá", hint: "Giá khác nhau theo kích cỡ, màu…" },
  { key: "CONTACT", label: "Liên hệ", hint: "Khách gọi, nhắn Zalo hoặc nhắn tin để được báo giá" },
]

interface Props {
  industry: IndustryPluginContract
  priceVnd: string
  setPriceVnd: (v: string) => void
  pricing: ProductPricing
  setPricing: (p: ProductPricing) => void
}

export function ProductPricingEditor({ industry, priceVnd, setPriceVnd, pricing, setPricing }: Props) {
  const presets = industry.taxonomy.pricingPresets
  const setMode = (mode: PriceMode) => {
    let next: ProductPricing = { ...pricing, mode }
    // Lần đầu chọn khoảng giá: gợi ý sẵn nhóm đặc điểm đầu tiên của ngành, cuối tuần theo ngành
    if (mode === "RANGE" && pricing.dimensions.length === 0 && presets.variantDimensions[0]) {
      const d = presets.variantDimensions[0]
      next = withDimensions({ ...next, weekendIsPeak: pricing.weekendIsPeak || presets.weekendIsPeak }, [
        { key: d.key, label: d.label, values: d.values.slice(0, 3) },
      ])
    }
    setPricing(next)
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-caption font-semibold text-text mb-1">
          Giá bán <span className="text-danger">*</span>
        </span>
        <div role="radiogroup" aria-label="Kiểu giá" className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <Button
              key={m.key}
              type="button"
              variant="outline"
              size="sm"
              role="radio"
              aria-checked={pricing.mode === m.key}
              onClick={() => setMode(m.key)}
              title={m.hint}
              className={`min-h-10 text-body-sm font-semibold transition-colors ${
                pricing.mode === m.key ? "border-primary bg-primary/10 text-primary hover:bg-primary/10" : "border-border bg-surface text-text hover:bg-surface-alt"
              }`}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-caption text-text-muted">{MODES.find((m) => m.key === pricing.mode)?.hint}</p>
      </div>

      {pricing.mode === "FIXED" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-caption text-text-muted mb-1">Giá thường (₫)</span>
            <MoneyInput label="Giá thường" value={priceVnd} onChange={setPriceVnd} placeholder="Ví dụ: 650.000" />
          </label>
          <label className="block">
            <span className="block text-caption text-text-muted mb-1">Giá cao điểm (₫) · không bắt buộc</span>
            <MoneyInput
              label="Giá cao điểm"
              value={formatVndInput(pricing.peakPriceVnd)}
              onChange={(v) => setPricing({ ...pricing, peakPriceVnd: parseVndInput(v) })}
              placeholder="Để trống = như giá thường"
            />
          </label>
        </div>
      )}

      {pricing.mode === "RANGE" && (
        <>
          <PricingDimensionsPicker
            presets={presets.variantDimensions}
            dimensions={pricing.dimensions}
            onChange={(dims) => setPricing(withDimensions(pricing, dims))}
          />
          <PricingVariantTable pricing={pricing} setPricing={setPricing} />
        </>
      )}

      {pricing.mode === "CONTACT" && (
        <p className="rounded-xl bg-surface-alt px-3 py-2 text-body-sm text-text-muted">
          Khách sẽ thấy chữ &ldquo;Liên hệ&rdquo; cùng các nút Gọi điện, Zalo và Nhắn tin. Mẫu này không đặt hàng trực tuyến.
        </p>
      )}

      {pricing.mode !== "CONTACT" && (
        <div className="rounded-xl bg-surface-alt px-3 py-2 text-caption text-text-muted space-y-1">
          <p>Ngày cao điểm là các ngày lễ cửa hàng đã khai trong Chính sách cửa hàng. Khách đặt giao vào ngày đó sẽ trả giá cao điểm.</p>
          <label className="flex items-center gap-2 text-body-sm text-text cursor-pointer">
            <Checkbox
              checked={pricing.weekendIsPeak}
              onCheckedChange={(checked) => setPricing({ ...pricing, weekendIsPeak: !!checked })}
            />
            <span>Tính Thứ 7 và Chủ nhật là ngày cao điểm</span>
          </label>
        </div>
      )}
    </div>
  )
}
