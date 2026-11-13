"use client"

import React from "react"
import { X } from "@/components/ui/icon-set/x"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Button } from "@/components/ui/button"
import {
  SORT_OPTIONS,
  type OccasionDef,
  type PriceRangeDef,
  type ProductFilterState,
} from "./product-filter-types"

interface ProductActiveFilterChipsProps {
  filters: ProductFilterState
  onChange: (updater: (prev: ProductFilterState) => ProductFilterState) => void
  onClearCustomPrice: () => void
  activeOccasionDef?: OccasionDef | undefined
  activePriceDef?: PriceRangeDef | undefined
}

export function ProductActiveFilterChips({
  filters,
  onChange,
  onClearCustomPrice,
  activeOccasionDef,
  activePriceDef,
}: ProductActiveFilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="text-caption text-text-muted flex items-center gap-1 mr-1">
        <SlidersHorizontal size={12} />
        Đang lọc:
      </span>

      {filters.search && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-alt border border-border px-2 py-0.5 text-caption font-medium text-text">
          Từ khoá: &quot;{filters.search}&quot;
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange((prev) => ({ ...prev, search: "" }))}
            aria-label="Bỏ lọc từ khoá"
            className="h-4 w-4 p-0 text-text-muted hover:text-text hover:bg-transparent"
          >
            <X size={12} />
          </Button>
        </span>
      )}

      {filters.category !== "Tất cả" && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 text-caption font-bold text-primary">
          {filters.category}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange((prev) => ({ ...prev, category: "Tất cả" }))}
            aria-label="Bỏ lọc danh mục"
            className="h-4 w-4 p-0 text-primary hover:text-primary-dark hover:bg-transparent"
          >
            <X size={12} />
          </Button>
        </span>
      )}

      {filters.occasion !== "all" && activeOccasionDef && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 text-caption font-bold text-primary">
          Dịp: {activeOccasionDef.shortLabel}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange((prev) => ({ ...prev, occasion: "all" }))}
            aria-label="Bỏ lọc dịp"
            className="h-4 w-4 p-0 text-primary hover:text-primary-dark hover:bg-transparent"
          >
            <X size={12} />
          </Button>
        </span>
      )}

      {filters.priceRange !== "all" && activePriceDef && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 text-caption font-bold text-primary">
          Giá: {filters.priceRange === "custom"
            ? `${(filters.customMinPrice ?? 0).toLocaleString("vi-VN")}đ - ${filters.customMaxPrice ? `${filters.customMaxPrice.toLocaleString("vi-VN")}đ` : "..."}`
            : activePriceDef.shortLabel}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClearCustomPrice}
            aria-label="Bỏ lọc giá"
            className="h-4 w-4 p-0 text-primary hover:text-primary-dark hover:bg-transparent"
          >
            <X size={12} />
          </Button>
        </span>
      )}

      {filters.sortBy !== "default" && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-alt border border-border px-2 py-0.5 text-caption font-medium text-text">
          Xếp: {SORT_OPTIONS.find((s) => s.id === filters.sortBy)?.label}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange((prev) => ({ ...prev, sortBy: "default" }))}
            aria-label="Bỏ sắp xếp"
            className="h-4 w-4 p-0 text-text-muted hover:text-text hover:bg-transparent"
          >
            <X size={12} />
          </Button>
        </span>
      )}
    </div>
  )
}
