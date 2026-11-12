"use client"

import React from "react"
import { Layers, Camera, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { ProductThumb } from "@/components/products/product-thumb"
import type { CatalogProduct } from "./catalog-management-tab"

interface CampaignProductPickerProps {
  activeProducts: CatalogProduct[]
  selectedProductIds: string[]
  onToggleProduct: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onOpenQuickUpload: () => void
}

export function CampaignProductPicker({
  activeProducts,
  selectedProductIds,
  onToggleProduct,
  onSelectAll,
  onDeselectAll,
  onOpenQuickUpload,
}: CampaignProductPickerProps) {
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const isAllSelected = selectedProductIds.length === activeProducts.length && activeProducts.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <label className="text-caption font-bold text-text flex items-center gap-1.5">
          <Layers size={14} className="text-primary" />
          <span>Tuyển chọn {ti.sampleProduct} bán ({selectedProductIds.length}/{activeProducts.length})</span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenQuickUpload}
            className="h-7 text-caption gap-1 text-primary border-primary/30 hover:bg-primary-muted/20 font-bold"
          >
            <Camera size={13} />
            <span>📸 Tải ảnh {ti.sampleProduct} mới vào chiến dịch</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="text-caption h-7"
          >
            {isAllSelected ? "Bỏ chọn" : "Chọn tất cả"}
          </Button>
        </div>
      </div>

      {activeProducts.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-surface-alt/40 border border-border text-caption text-text-muted">
          Kho sản phẩm hiện chưa có mẫu nào. Bạn có thể bấm nút &quot;📸 Tải ảnh mới&quot; ở trên để thêm sản phẩm vào chiến dịch.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-2.5 rounded-xl bg-surface-alt/40 border border-border">
          {activeProducts.map((p) => {
            const isSelected = selectedProductIds.includes(p.id)
            return (
              <Button variant="outline"
                key={p.id}
                type="button"
                onClick={() => onToggleProduct(p.id)}
                className={`h-auto text-[length:inherit] justify-start font-[inherit] relative rounded-xl border text-left p-2 transition-all flex flex-col gap-1.5 group cursor-pointer ${
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
                    className={`absolute top-1.5 right-1.5 h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary text-surface shadow-xs" : "bg-black/30 text-white/70"
                    }`}
                  >
                    {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-3 w-3 border border-white/80 rounded-xs" />}
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-caption font-bold text-text truncate group-hover:text-primary transition-colors">
                    {p.name}
                  </h4>
                  <div className="flex items-center justify-between text-meta text-text-muted mt-0.5">
                    <span className="font-mono text-2xs truncate">{p.code}</span>
                    {p.price && (
                      <span className="font-semibold text-primary text-2xs">
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
  )
}
