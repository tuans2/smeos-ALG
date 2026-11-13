"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useMemo } from "react"
import { Sparkles, Check } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductThumb } from "@/components/products/product-thumb"
import type { CatalogProduct } from "./catalog-management-tab"

interface CatalogWizardStep1ProductsProps {
  products: CatalogProduct[]
  selectedIds: string[]
  onToggleProduct: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClearSelection: () => void
  onQuickPreset: (type: "all" | "occasion" | "budget") => void
}

export function CatalogWizardStep1Products({
  products,
  selectedIds,
  onToggleProduct,
  onSelectAll,
  onClearSelection,
  onQuickPreset,
}: CatalogWizardStep1ProductsProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterOccasion, setFilterOccasion] = React.useState("")

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === "ACTIVE"),
    [products]
  )

  const availableOccasions = useMemo(() => {
    const set = new Set<string>()
    activeProducts.forEach((p) => {
      if (p.occasion_code) set.add(p.occasion_code)
    })
    return Array.from(set)
  }, [activeProducts])

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      if (
        searchQuery.trim() &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.code.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      if (filterOccasion && p.occasion_code !== filterOccasion) return false
      return true
    })
  }, [activeProducts, searchQuery, filterOccasion])

  return (
    <div className="space-y-4">
      {/* Lựa chọn nhanh (Presets) */}
      <div className="p-4 rounded-xl bg-surface-alt/60 border border-border space-y-2">
        <span className="text-caption font-bold text-text uppercase tracking-wider flex items-center gap-1.5 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gợi ý tạo nhanh theo bộ sưu tập</span>
        </span>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onQuickPreset("all")}
            className="text-caption hover:border-primary"
          >
            ✨ Toàn bộ sản phẩm ({activeProducts.length} mẫu)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onQuickPreset("occasion")}
            className="text-caption hover:border-primary"
          >
            🎯 Theo sự kiện đang bán chạy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onQuickPreset("budget")}
            className="text-caption hover:border-primary"
          >
            💰 Phân khúc giá dưới 800K
          </Button>
        </div>
      </div>

      {/* Thanh tìm kiếm & Lọc */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã sản phẩm..."
            className="text-body-sm h-9"
          />
          {availableOccasions.length > 0 && (
            <NativeSelect
              value={filterOccasion}
              onChange={(e) => setFilterOccasion(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2.5 text-body-sm text-text"
            >
              <option value="">Tất cả dịp</option>
              {availableOccasions.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-caption text-text-muted">
            Đã chọn: <strong className="text-primary font-bold">{selectedIds.length}</strong> sản phẩm
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectAll(filteredProducts.map((p) => p.id))}
            className="text-caption h-8"
          >
            Chọn tất cả
          </Button>
          {selectedIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-caption h-8 text-destructive"
            >
              Bỏ chọn
            </Button>
          )}
        </div>
      </div>

      {/* Lưới sản phẩm */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto p-1">
        {filteredProducts.map((p) => {
          const isSelected = selectedIds.includes(p.id)
          return (
            <Button variant="outline"
              type="button"
              key={p.id}
              onClick={() => onToggleProduct(p.id)}
              className={`h-auto text-[length:inherit] font-[inherit] gap-0 rounded-xl border p-2.5 flex flex-col justify-between cursor-pointer transition-all text-left w-full ${
                isSelected
                  ? "border-primary bg-primary-muted/20 ring-1 ring-primary shadow-xs hover:bg-primary-muted/20"
                  : "border-border bg-surface hover:border-border-hover hover:bg-surface"
              }`}
            >
              <div className="aspect-square w-full rounded-lg bg-surface-alt overflow-hidden mb-2 relative">
                <ProductThumb
                  name={p.name}
                  masterImageUrl={p.imageUrl ?? undefined}
                  driveLink={p.driveLink ?? undefined}
                  size="card"
                />
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-surface flex items-center justify-center shadow-xs">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div>
                <div className="text-body-sm font-bold text-text truncate">{p.name}</div>
                <div className="text-caption text-primary font-semibold">
                  {p.price ? `${p.price.toLocaleString("vi-VN")} đ` : "Liên hệ"}
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
