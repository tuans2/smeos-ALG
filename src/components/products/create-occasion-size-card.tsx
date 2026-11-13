"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"

import { MultiSelectDropdown } from "./multi-select-dropdown"
import type { ProductOccasionSize } from "./use-product-occasion-size"

/** Thẻ "Dịp & kích thước" trong form tạo mẫu (checklist ALG 2.1). */
export function CreateOccasionSizeCard({ value, craftStyles = [] }: { value: ProductOccasionSize; craftStyles?: readonly { key: string; label: string }[] }) {
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="border-b border-border pb-3 text-title-sm font-bold text-text">Dịp tặng & kích thước</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor="product-occasions" className="mb-1 block text-caption font-semibold text-text">Dịp phù hợp</label>
          <MultiSelectDropdown
            id="product-occasions"
            ariaLabel="Dịp phù hợp"
            options={value.occasions.map((o) => o.name)}
            value={value.selectedNames}
            onChange={value.setSelectedNames}
            placeholder={value.occasions.length > 0 ? "Chọn các dịp phù hợp…" : "Tiệm chưa khai danh mục dịp"}
          />
        </div>
        <div>
          <label htmlFor="product-height" className="mb-1 block text-caption font-semibold text-text">Chiều cao (cm)</label>
          <Input id="product-height" type="number" min={1} inputMode="numeric" value={value.heightCm} onChange={(e) => value.setHeightCm(e.target.value)} placeholder="VD: 60" />
        </div>
        <div>
          <label htmlFor="product-width" className="mb-1 block text-caption font-semibold text-text">Chiều rộng (cm)</label>
          <Input id="product-width" type="number" min={1} inputMode="numeric" value={value.widthCm} onChange={(e) => value.setWidthCm(e.target.value)} placeholder="VD: 40" />
        </div>
        {craftStyles.length > 0 && (
          <div>
            <label htmlFor="product-craft-style" className="mb-1 block text-caption font-semibold text-text">Kiểu dáng (giá ngày lễ)</label>
            <NativeSelect id="product-craft-style" value={value.craftStyle} onChange={(e) => value.setCraftStyle(e.target.value)}>
              <option value="">Chưa gắn</option>
              {craftStyles.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </NativeSelect>
          </div>
        )}
      </div>
    </Card>
  )
}
