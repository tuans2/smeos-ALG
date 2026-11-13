"use client"

import { InfoTip } from "@/components/ui/info-tip"
import React, { useState } from "react"
import { Search } from "@/components/ui/icon-set/search"
import { X } from "@/components/ui/icon-set/x"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { LayoutList } from "@/components/ui/icon-set/layout-list"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowUpDown } from "@/components/ui/icon-set/arrow-up-down"
import { CircleDollarSign } from "@/components/ui/icon-set/circle-dollar-sign"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import {
  OCCASIONS,
  PRICE_RANGES,
  SORT_OPTIONS,
  type OccasionId,
  type PriceRangeId,
  type ProductFilterState,
  type SortOptionId,
} from "./product-filter-types"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { ProductActiveFilterChips } from "./product-active-filter-chips"

export interface ProductSearchFilterBarProps {
  filters: ProductFilterState
  onChange: (updater: (prev: ProductFilterState) => ProductFilterState) => void
  onReset: () => void
  viewMode: "grid" | "table"
  onViewModeChange: (mode: "grid" | "table") => void
  totalCount: number
  availableCategories?: string[]
}

const DEFAULT_CATEGORIES = [
  "Tất cả",
]

export function ProductSearchFilterBar({
  filters,
  onChange,
  onReset,
  viewMode,
  onViewModeChange,
  totalCount,
  availableCategories = DEFAULT_CATEGORIES,
}: ProductSearchFilterBarProps) {
  const { ti } = useI18n()
  const sampleProductLower = ti("sampleProduct") ? ti("sampleProduct").toLowerCase() : "sản phẩm"
  const [showCustomPrice, setShowCustomPrice] = useState(filters.priceRange === "custom")

  const activeOccasionDef = OCCASIONS.find((o) => o.id === filters.occasion)
  const activePriceDef = PRICE_RANGES.find((p) => p.id === filters.priceRange)

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "Tất cả" ||
    filters.occasion !== "all" ||
    filters.priceRange !== "all" ||
    filters.sortBy !== "default"

  const handlePriceChange = (id: PriceRangeId) => {
    if (id === "custom") {
      setShowCustomPrice(true)
      onChange((prev) => ({ ...prev, priceRange: "custom" }))
    } else {
      setShowCustomPrice(false)
      onChange((prev) => ({
        ...prev,
        priceRange: id,
        customMinPrice: null,
        customMaxPrice: null,
      }))
    }
  }

  return (
    <div className="flex flex-shrink-0 flex-col gap-3 border-b border-border bg-surface px-4 py-3">
      {/* Hàng 1: Ô tìm kiếm + Toggle Grid/Table */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={1.8}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted z-10"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => {
              const val = e.target.value
              onChange((prev) => ({ ...prev, search: val }))
            }}
            placeholder={`Tìm theo tên hoặc mã ${sampleProductLower}…`}
            aria-label={`Tìm kiếm ${sampleProductLower}`}
            className="h-10 pl-10 pr-9 text-body-sm"
          />
          {filters.search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange((prev) => ({ ...prev, search: "" }))}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-text-muted hover:text-text p-0 hover:bg-transparent"
            >
              <X size={15} />
            </Button>
          )}
        </div>

        {/* Toggle Grid / Bảng */}
        <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange("grid")}
            aria-label="Xem dạng lưới"
            aria-pressed={viewMode === "grid"}
            className={`flex h-10 w-10 items-center justify-center rounded-none transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-white hover:bg-primary hover:text-white"
                : "bg-surface text-text-muted hover:bg-surface-alt"
            }`}
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange("table")}
            aria-label="Xem dạng bảng"
            aria-pressed={viewMode === "table"}
            className={`flex h-10 w-10 items-center justify-center rounded-none border-l border-border transition-colors ${
              viewMode === "table"
                ? "bg-primary text-white hover:bg-primary hover:text-white"
                : "bg-surface text-text-muted hover:bg-surface-alt"
            }`}
          >
            <LayoutList size={16} />
          </Button>
        </div>
      </div>

      {/* Hàng 2: Bộ lọc nhanh Danh mục (Category Chips) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none" role="group" aria-label="Lọc theo danh mục">
        {availableCategories.map((cat) => (
          <Button
            key={cat}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange((prev) => ({ ...prev, category: cat }))}
            aria-pressed={filters.category === cat}
            className={`flex-shrink-0 rounded-full border px-3.5 py-1 text-caption font-semibold transition-colors h-auto ${
              filters.category === cat
                ? "border-primary bg-primary text-white hover:bg-primary hover:text-white"
                : "border-border bg-surface text-text-muted hover:border-primary/50 hover:text-text"
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Hàng 3: Bộ lọc chuyên sâu theo Dịp, Giá & Sắp xếp */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc theo Dịp */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt/70 px-2.5 py-1 text-body-sm">
            <Sparkles size={14} className="text-primary shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold text-text-muted">Dịp:</span>
            <NativeSelect
              value={filters.occasion}
              onChange={(e) => {
                const occ = e.target.value as OccasionId
                onChange((prev) => ({ ...prev, occasion: occ }))
              }}
              aria-label="Chọn dịp phù hợp"
              className="h-8 border-none bg-transparent py-0 pl-1 pr-8 text-caption font-semibold leading-none"
            >
              {OCCASIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Lọc theo Khoảng giá */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt/70 px-2.5 py-1 text-body-sm">
            <CircleDollarSign size={14} className="text-primary shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold text-text-muted">Giá:</span>
            <NativeSelect
              value={filters.priceRange}
              onChange={(e) => handlePriceChange(e.target.value as PriceRangeId)}
              aria-label="Chọn mức giá"
              className="h-8 border-none bg-transparent py-0 pl-1 pr-8 text-caption font-semibold leading-none"
            >
              {PRICE_RANGES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Sắp xếp */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt/70 px-2.5 py-1 text-body-sm">
            <ArrowUpDown size={14} className="text-text-muted shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold text-text-muted">Xếp:</span>
            <NativeSelect
              value={filters.sortBy}
              onChange={(e) => {
                const s = e.target.value as SortOptionId
                onChange((prev) => ({ ...prev, sortBy: s }))
              }}
              aria-label="Sắp xếp sản phẩm"
              className="h-8 border-none bg-transparent py-0 pl-1 pr-8 text-caption font-semibold leading-none"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Nút Đặt lại bộ lọc */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-caption font-semibold text-danger hover:underline px-2 py-1.5 h-auto rounded-lg hover:bg-danger-bg hover:text-danger"
              title="Khôi phục tất cả bộ lọc về mặc định"
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </Button>
          )}
        </div>

        {/* Tổng số sản phẩm hiển thị */}
        <div className="text-caption text-text-muted">
          Tìm thấy <span className="font-extrabold text-text">{totalCount}</span> {sampleProductLower}
        </div>
      </div>

      {/* Hộp nhập khoảng giá tùy chọn nếu chọn "Tùy chọn khoảng giá" */}
      {showCustomPrice && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-surface-alt border border-border text-body-sm">
          <span className="text-caption font-bold text-text">Khoảng giá:</span>
          <InfoTip label="Khoảng giá">Ví dụ: từ 300.000 đến 1.500.000 ₫</InfoTip>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              step={50000}
              value={filters.customMinPrice ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                onChange((prev) => ({ ...prev, customMinPrice: v }))
              }}
              placeholder="Từ (VNĐ)"
              aria-label="Giá tối thiểu"
              className="h-8 w-28 text-caption"
            />
            <span className="text-text-muted text-caption">—</span>
            <Input
              type="number"
              min={0}
              step={50000}
              value={filters.customMaxPrice ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                onChange((prev) => ({ ...prev, customMaxPrice: v }))
              }}
              placeholder="Đến (VNĐ)"
              aria-label="Giá tối đa"
              className="h-8 w-28 text-caption"
            />
          </div>
        </div>
      )}

      {/* Hàng 4: Active Filter Chips tóm tắt */}
      {hasActiveFilters && (
        <ProductActiveFilterChips
          filters={filters}
          onChange={onChange}
          onClearCustomPrice={() => {
            setShowCustomPrice(false)
            onChange((prev) => ({
              ...prev,
              priceRange: "all",
              customMinPrice: null,
              customMaxPrice: null,
            }))
          }}
          activeOccasionDef={activeOccasionDef}
          activePriceDef={activePriceDef}
        />
      )}
    </div>
  )
}
