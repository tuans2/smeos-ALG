"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import React from "react"
import { DollarSign, Sparkles, User } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { GREETING_TEMPLATE_LIST } from "@/modules/greeting-card/domain/greeting-template-registry"
import { getIndustryQuickCollectionOptions } from "./quick-collection-options"
import { usePriceBudgets } from "./use-price-budgets"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

export interface QuickCollectionCriteriaState {
  customerName: string
  customerPhone: string
  occasion: string
  category: string
  flowerType: string
  colorTone: string
  selectedBudgetIds: string[]
  priceMin: number | undefined
  priceMax: number | undefined
  productLimit: number
  templateId: string
}

/** Bảng tiêu chí của "Tạo nhanh bộ sưu tập": khách (tuỳ chọn), giá, dịp, dáng, loại hoa, màu, số mẫu, giao diện. */
export function QuickCollectionCriteriaPanel({
  value,
  onChange,
}: {
  value: QuickCollectionCriteriaState
  onChange: (patch: Partial<QuickCollectionCriteriaState>) => void
}) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const options = getIndustryQuickCollectionOptions(organization?.industry)
  const priceBudgets = usePriceBudgets()
  const { customerName, customerPhone, occasion, category, flowerType, colorTone, selectedBudgetIds, priceMin, priceMax, productLimit, templateId } = value
  const handleToggleBudget = (id: string) =>
    onChange({ selectedBudgetIds: selectedBudgetIds.includes(id) ? selectedBudgetIds.filter((item) => item !== id) : [...selectedBudgetIds, id] })

  return (
    <>
    {/* 1. KHỐI THÔNG TIN KHÁCH (TÙY CHỌN) */}
    <div className="p-3.5 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-caption font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
          <User size={13} />
          Khách hàng (tùy chọn)
        </div>
        <span className="text-caption text-text-muted">Lời chào gắn tên riêng</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <Input
            value={customerName}
            onChange={(e) => onChange({ customerName: e.target.value })}
            placeholder="Tên khách (vd: Chị Lan)"
            className="h-9 text-body-sm"
          />
        </div>
        <div>
          <Input
            value={customerPhone}
            onChange={(e) => onChange({ customerPhone: e.target.value })}
            placeholder="Số điện thoại"
            className="h-9 text-body-sm"
          />
        </div>
      </div>
    </div>

    {/* 2. BẢNG TIÊU CHÍ */}
    <div className="p-3.5 rounded-2xl border border-border bg-surface space-y-3.5">
      {/* Khoảng giá */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-caption font-bold text-text flex items-center gap-1.5">
            <DollarSign size={14} className="text-primary" />
            Khoảng giá (chọn nhiều khung)
          </label>
          <div className="flex items-center gap-1">
            {priceBudgets.map((qb) => {
              const isSelected = selectedBudgetIds.includes(qb.id)
              return (
                <Button variant="outline"
                  type="button"
                  key={qb.id}
                  onClick={() => handleToggleBudget(qb.id)}
                  className={`h-auto gap-0 px-2 py-0.5 rounded-full text-caption font-medium transition border ${
                    isSelected
                      ? "border-primary bg-primary text-white font-bold hover:bg-primary"
                      : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
                  }`}
                >
                  {qb.label}
                </Button>
              )
            })}
            {(selectedBudgetIds.length > 0 || priceMin !== undefined || priceMax !== undefined) && (
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  onChange({ selectedBudgetIds: [], priceMin: undefined, priceMax: undefined })
                }}
                className="h-auto font-[inherit] gap-0 px-1.5 py-0.5 text-caption text-text-muted hover:text-text underline"
              >
                Bỏ chọn
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Giá từ"
            value={priceMin ?? ""}
            onChange={(e) => onChange({ priceMin: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9 text-body-sm"
          />
          <Input
            type="number"
            placeholder="Đến"
            value={priceMax ?? ""}
            onChange={(e) => onChange({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9 text-body-sm"
          />
        </div>
      </div>

      {/* Dịp / Sự kiện */}
      <div>
        <label className="block text-caption font-bold text-text mb-1.5">
          Dịp & Nhu cầu
        </label>
        <div className="flex flex-wrap gap-1.5">
          {options.occasions.map((occ) => (
            <Button variant="outline"
              type="button"
              key={occ}
              onClick={() => onChange({ occasion: occasion === occ ? "" : occ })}
              className={`h-auto gap-0 px-2.5 py-1 rounded-xl text-caption font-medium transition border ${
                occasion === occ
                  ? "border-primary bg-primary text-white font-bold shadow-xs hover:bg-primary"
                  : "border-border bg-surface text-text hover:border-primary/40 hover:bg-surface"
              }`}
            >
              {occ}
            </Button>
          ))}
        </div>
      </div>

      {/* Phân loại & Nguyên phụ liệu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-caption font-bold text-text mb-1.5">
            Phân loại {terms.sampleProduct.toLowerCase()}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {options.categories.map((cat) => (
              <Button variant="outline"
                type="button"
                key={cat}
                onClick={() => onChange({ category: category === cat ? "" : cat })}
                className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                  category === cat
                    ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                    : "border-border bg-surface text-text hover:border-primary/40 hover:bg-surface"
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-caption font-bold text-text mb-1.5">
            {terms.rawMaterialItem}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {options.materials.map((mat) => (
              <Button variant="outline"
                type="button"
                key={mat}
                onClick={() => onChange({ flowerType: flowerType === mat ? "" : mat })}
                className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                  flowerType === mat
                    ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                    : "border-border bg-surface text-text hover:border-primary/40 hover:bg-surface"
                }`}
              >
                {mat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tone màu & Số lượng mẫu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
        <div>
          <label className="block text-caption font-bold text-text mb-1.5">
            Tone màu
          </label>
          <div className="flex flex-wrap gap-1.5">
            {options.colors.map((col) => (
              <Button variant="outline"
                type="button"
                key={col}
                onClick={() => onChange({ colorTone: colorTone === col ? "" : col })}
                className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                  colorTone === col
                    ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                    : "border-border bg-surface text-text hover:border-primary/40 hover:bg-surface"
                }`}
              >
                {col}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-caption font-bold text-text">
              Số mẫu gửi khách
            </label>
            <span className="text-caption font-bold text-primary">{productLimit} mẫu</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[4, 6, 8, 10, 12].map((num) => (
              <Button variant="outline"
                type="button"
                key={num}
                onClick={() => onChange({ productLimit: num })}
                className={`h-auto px-0 gap-0 flex-1 py-1 rounded-lg text-caption font-medium transition border text-center ${
                  productLimit === num
                    ? "border-primary bg-primary text-white font-bold hover:bg-primary"
                    : "border-border bg-surface text-text hover:border-primary/40 hover:bg-surface"
                }`}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Giao diện Thẻ Chào Sản Phẩm (Dropdown) */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-caption font-bold text-text flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" />
            Mẫu giao diện
          </label>
          <span className="text-caption text-text-muted">
            Vuốt 3D · {GREETING_TEMPLATE_LIST.length} mẫu
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <NativeSelect
              aria-label="Mẫu giao diện bộ sưu tập"
              value={templateId}
              onChange={(e) => onChange({ templateId: e.target.value })}
              className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-body-sm text-text font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              {GREETING_TEMPLATE_LIST.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.styleNumber ? `#${tmpl.styleNumber} · ` : ""}{tmpl.name} ({tmpl.subtitle || tmpl.tag})
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex items-center px-3 py-1.5 rounded-xl bg-surface-alt border border-border text-caption text-text-muted truncate">
            <span className="font-semibold text-text mr-1">Phong cách:</span>
            <span className="truncate">
              {GREETING_TEMPLATE_LIST.find((t) => t.id === templateId)?.tag || "Sang trọng"}
            </span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
