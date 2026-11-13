"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useState, useMemo } from "react"
import { Search, CheckCircle2, Store, Plus } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { ProductThumb } from "@/components/products/product-thumb"
import type { CatalogProduct } from "./catalog-management-tab"

interface ProductLibraryModalProps {
  open: boolean
  onClose: () => void
  products: CatalogProduct[]
  selectedIds: string[]
  onSelectProducts: (selectedProducts: CatalogProduct[]) => void
}

export function ProductLibraryModal({
  open,
  onClose,
  products,
  selectedIds: initialSelectedIds,
  onSelectProducts,
}: ProductLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)

  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = selectedCategory === "ALL" || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [products, searchTerm, selectedCategory])

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    const chosen = products.filter((p) => selectedIds.includes(p.id))
    onSelectProducts(chosen)
    onClose()
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }} size="lg"
      title={<span className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" />Chọn sản phẩm từ Kho cửa hàng</span>}
      description={`Tái sử dụng sản phẩm và ảnh chất lượng cao đã có sẵn trong shop (${products.length} sản phẩm)`}>
      <div className="-m-5 sm:-m-6 flex flex-col">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-2.5 bg-surface">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên sản phẩm, mã SKU..."
              className="pl-9 text-body-sm h-9"
            />
          </div>
          {categories.length > 0 && (
            <NativeSelect
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-caption font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Tất cả danh mục ({products.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-2">
              <p className="text-body-sm font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
              <p className="text-caption">Hãy thử đổi từ khóa tìm kiếm hoặc lọc theo danh mục khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id)
                return (
                  <Button variant="outline"
                    key={p.id}
                    type="button"
                    onClick={() => handleToggle(p.id)}
                    className={`h-auto text-[length:inherit] justify-start font-[inherit] relative rounded-xl border text-left p-2 transition-all flex flex-col gap-2 group cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary-muted/20 ring-2 ring-primary/30 hover:bg-primary-muted/20"
                        : "border-border bg-surface hover:border-primary-border hover:bg-surface-alt/50"
                    }`}
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-alt">
                      <ProductThumb
                        name={p.name}
                        masterImageUrl={p.imageUrl ?? undefined}
                        driveLink={p.driveLink ?? undefined}
                        size="card"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-surface flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-caption font-bold text-text line-clamp-1 group-hover:text-primary transition-colors">
                        {p.name}
                      </h4>
                      <div className="flex items-center justify-between text-meta mt-0.5">
                        <span className="text-text-muted">{p.code}</span>
                        {p.price && (
                          <span className="font-semibold text-primary">
                            {p.price.toLocaleString("vi-VN")} đ
                          </span>
                        )}
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-alt/40 flex items-center justify-between">
          <span className="text-caption text-text-muted">
            Đã chọn <strong className="text-primary">{selectedIds.length}</strong> sản phẩm từ kho
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={handleConfirm}
              className="bg-primary text-surface hover:bg-primary-dark gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Dùng {selectedIds.length} sản phẩm đã chọn</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
