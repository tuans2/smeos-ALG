"use client"

import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import React from "react"
import { ListFilter, Sparkles } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PublishedCatalogLinks, type CatalogLinkItem } from "./catalog-link-widgets"
import type { CatalogProduct } from "./catalog-management-tab"
import { Disclosure } from "@/components/ui/disclosure"
import { ShopReviewsManager } from "./reviews/shop-reviews-manager"
import { formatCurrency } from "@/lib/i18n/formatters"

interface CatalogExpertManagerProps {
  products: CatalogProduct[]
  catalogLinks: CatalogLinkItem[]
  onRefresh: () => void
  onOpenCreateWizard: () => void
  sampleProductTerm: string
}

export function CatalogExpertManager({
  products,
  catalogLinks,
  onRefresh,
  onOpenCreateWizard,
  sampleProductTerm,
}: CatalogExpertManagerProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterOccasion, setFilterOccasion] = React.useState("")
  const [filterPriceMin, setFilterPriceMin] = React.useState("")
  const [filterPriceMax, setFilterPriceMax] = React.useState("")

  const activeProducts = React.useMemo(() => products.filter((p) => p.status === "ACTIVE"), [products])

  const availableOccasions = React.useMemo(() => {
    const set = new Set<string>()
    activeProducts.forEach((p) => {
      if (p.occasion_code) set.add(p.occasion_code)
    })
    return Array.from(set)
  }, [activeProducts])

  const filteredProducts = React.useMemo(() => {
    return activeProducts.filter((p) => {
      if (
        searchQuery.trim() &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.code.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      if (filterOccasion && p.occasion_code !== filterOccasion) return false
      if (filterPriceMin && (p.price == null || p.price < Number(filterPriceMin))) return false
      if (filterPriceMax && (p.price == null || p.price > Number(filterPriceMax))) return false
      return true
    })
  }, [activeProducts, searchQuery, filterOccasion, filterPriceMin, filterPriceMax])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const selectAll = () => {
    setSelectedIds(selectedIds.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id))
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-alt border border-border text-text-muted text-caption font-bold uppercase tracking-wider mb-1">
            <ListFilter className="h-3.5 w-3.5" />
            <span>Chế độ Quản lý chuyên sâu</span>
          </div>
          <h2 className="text-title font-bold text-text">Danh mục sản phẩm & Liên kết catalog đã tạo</h2>
          <p className="text-body-sm text-text-muted mt-0.5">
            Quản lý các link catalog đang hoạt động, tra cứu mã QR và kiểm tra trạng thái các sản phẩm.
          </p>
        </div>
        <Button
          onClick={onOpenCreateWizard}
          className="bg-primary text-surface hover:bg-primary-dark flex items-center gap-1.5 shrink-0 px-4"
        >
          <Sparkles className="h-4 w-4" />
          <span>Tạo Catalog mới</span>
        </Button>
      </div>

      {/* Published Links Section */}
      <PublishedCatalogLinks catalogLinks={catalogLinks} onRefresh={onRefresh} />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface border border-border">
        <div>
          <label className="block text-caption font-semibold text-text-muted mb-1">Tìm kiếm</label>
          <Input
            placeholder="Tên hoặc mã sản phẩm…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-body-sm"
          />
        </div>
        <div>
          <label className="block text-caption font-semibold text-text-muted mb-1">Dịp tặng</label>
          <NativeSelect
            value={filterOccasion}
            onChange={(e) => setFilterOccasion(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả dịp</option>
            {availableOccasions.map((occ) => (
              <option key={occ} value={occ}>
                {occ}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="block text-caption font-semibold text-text-muted mb-1">Giá từ (VNĐ)</label>
          <Input
            type="number"
            placeholder="0"
            value={filterPriceMin}
            onChange={(e) => setFilterPriceMin(e.target.value)}
            className="h-9 text-body-sm"
          />
        </div>
        <div>
          <label className="block text-caption font-semibold text-text-muted mb-1">Giá đến (VNĐ)</label>
          <Input
            type="number"
            placeholder="Tối đa"
            value={filterPriceMax}
            onChange={(e) => setFilterPriceMax(e.target.value)}
            className="h-9 text-body-sm"
          />
        </div>
      </div>

      {/* Product Selection List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-body-sm font-bold text-text flex items-center gap-2">
            <span>
              {sampleProductTerm} sẵn sàng trong kho ({filteredProducts.length})
            </span>
            {selectedIds.length > 0 && <Badge tone="accent">Đã chọn {selectedIds.length}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-caption h-8">
            {selectedIds.length === filteredProducts.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const isSelected = selectedIds.includes(p.id)
            return (
              <Button variant="outline"
                key={p.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleSelect(p.id)}
                className={`h-auto text-[length:inherit] justify-start font-[inherit] rounded-2xl border p-3.5 flex items-center gap-3 w-full text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isSelected
                    ? "border-primary bg-primary-muted/20 shadow-xs hover:bg-primary-muted/20"
                    : "border-border bg-surface hover:border-border-hover hover:bg-surface"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="h-4 w-4 accent-primary rounded pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-bold text-text-muted">{p.code}</span>
                    <span className="text-body-sm font-bold text-text truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-caption text-text-muted">
                    {p.category && <span>{p.category}</span>}
                    {p.occasion_code && <span>· {p.occasion_code}</span>}
                  </div>
                </div>
                {p.price != null && (
                  <div className="text-body-sm font-black text-primary shrink-0">
                    {formatCurrency(p.price)}
                  </div>
                )}
              </Button>
            )
          })}
        </div>
      </div>
      <Disclosure label="Đánh giá khách hiện trên trang catalog (Khách hàng nói gì)">
        <ShopReviewsManager />
      </Disclosure>
    </div>
  )
}
