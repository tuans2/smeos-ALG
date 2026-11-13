"use client"

import React from "react"
import { Layers, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { CatalogProduct } from "./catalog-management-tab"
import { ProductThumb } from "@/components/products/product-thumb"

interface SmartInputStorePickerProps {
  availableProducts: CatalogProduct[]
  selectedProducts: CatalogProduct[]
  onOpenLibrary: () => void
  onToggleProduct: (product: CatalogProduct) => void
}

export function SmartInputStorePicker({
  availableProducts,
  selectedProducts,
  onOpenLibrary,
  onToggleProduct,
}: SmartInputStorePickerProps) {
  return (
    <div className="rounded-xl border border-border p-4 bg-surface-alt/30 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-caption font-semibold text-text">
          Kho sản phẩm của bạn đang có <strong>{availableProducts.length}</strong> mẫu sẵn sàng.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenLibrary}
          className="gap-1.5 text-primary border-primary/30 hover:bg-primary-muted/20 font-bold"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Mở danh mục chọn sản phẩm →</span>
        </Button>
      </div>

      {availableProducts.length > 0 ? (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span>Nhấp trực tiếp vào ảnh sản phẩm bên dưới để chọn đưa vào chiến dịch:</span>
            <span>
              Đã chọn: <strong className="text-primary font-bold">{selectedProducts.length}</strong>/{availableProducts.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto p-2 rounded-xl bg-surface border border-border">
            {availableProducts.map((p) => {
              const isSelected = selectedProducts.some((sp) => sp.id === p.id)
              return (
                <Button variant="outline"
                  key={p.id}
                  type="button"
                  onClick={() => onToggleProduct(p)}
                  className={`h-auto text-[length:inherit] justify-start font-[inherit] relative rounded-xl border text-left p-1.5 transition-all flex flex-col gap-1.5 group cursor-pointer ${
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
                    <div
                      className={`absolute top-1 right-1 h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary text-surface shadow-xs" : "bg-black/30 text-white/70"
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <div className="h-3 w-3 border border-white/80 rounded-xs" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-caption font-bold text-text truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </p>
                    <p className="text-meta text-primary font-semibold">
                      {p.price ? `${p.price.toLocaleString("vi-VN")} đ` : p.code}
                    </p>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenLibrary}
          className="h-auto w-full whitespace-normal font-[inherit] text-[length:inherit] p-6 border border-dashed border-border rounded-lg text-center hover:bg-surface cursor-pointer transition-colors"
        >
          <p className="text-body-sm text-text-muted font-medium">
            Chưa có sản phẩm nào trong kho. Bấm để tìm kiếm hoặc chuyển sang tab &quot;Tải từ máy&quot;.
          </p>
        </Button>
      )}
    </div>
  )
}
