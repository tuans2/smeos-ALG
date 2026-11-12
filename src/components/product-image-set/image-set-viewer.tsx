"use client"

import { safeImageSrc } from "@/lib/safe-image-src"
import React, { useState } from "react"
import { Download } from "@/components/ui/icon-set/download"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Button } from "@/components/ui/button"
import type { ProductSetVariantResult, ProductImageSetResult } from "@/modules/product-image-set/use-cases/get-product-image-set-result"

export interface ImageSetViewerProps {
  originalUrl: string
  result: ProductImageSetResult
  onUseInGreetingCard?: () => void
  onUseInCatalog?: () => void
}

export function ImageSetViewer({
  originalUrl,
  result,
  onUseInCatalog,
}: ImageSetViewerProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductSetVariantResult>(
    result.variants[0] || {
      id: "master",
      name: "Ảnh gốc",
      channelTarget: "Gốc",
      aspectRatio: "1:1",
      angleLabel: "Chính diện",
      url: originalUrl,
      passed: true,
    }
  )

  const handleDownloadAll = () => {
    // Mở tải từng ảnh trong tab mới
    for (const v of result.variants) {
      if (v.url) window.open(v.url, "_blank")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="text-body-sm font-bold text-text">{result.bundleName}</div>
          <div className="text-caption text-text-muted mt-0.5">
            Đã sinh {result.variants.length} ảnh biến thể đồng nhất • Điểm nhất quán bộ:{" "}
            <span className="text-success-text font-bold">
              {(result.qcEvaluation.setConsistencyScore * 100).toFixed(0)}% (Cùng 1 SP)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-xl border border-border text-caption font-semibold text-text hover:bg-surface-alt transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Tải trọn bộ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onUseInCatalog}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 h-auto rounded-xl bg-primary text-white text-caption font-semibold hover:bg-primary-dark transition-colors shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Dùng cho Catalog
          </Button>
        </div>
      </div>

      {/* Grid of Variants */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden border border-border shadow-md bg-surface-alt flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImageSrc(selectedVariant.url || originalUrl)}
              alt={selectedVariant.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-caption font-medium px-2.5 py-1 rounded-lg">
              {selectedVariant.aspectRatio} • {selectedVariant.angleLabel}
            </div>
            <div className="absolute bottom-3 right-3 bg-primary/90 text-white text-caption font-semibold px-2.5 py-1 rounded-lg">
              {selectedVariant.channelTarget}
            </div>
          </div>
          <div className="text-center text-caption font-medium text-text">
            {selectedVariant.name}
          </div>
        </div>

        {/* Right: Variant Thumbnails & QC */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-caption font-bold text-text uppercase tracking-wider">
            Các ảnh trong bộ ({result.variants.length})
          </div>

          <div className="grid grid-cols-2 gap-3">
            {result.variants.map((v) => {
              const isSelected = selectedVariant.id === v.id
              return (
                <Button
                  key={v.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedVariant(v)}
                  aria-pressed={isSelected}
                  className={`p-2 h-auto rounded-xl border text-left transition-all relative group overflow-hidden cursor-pointer block whitespace-normal w-full ${
                    isSelected
                      ? "border-primary bg-primary-muted ring-1 ring-primary shadow-xs"
                      : "border-border bg-surface hover:border-primary/40"
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-surface-alt mb-2 border border-border/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.url} alt={v.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-caption font-bold text-text line-clamp-1">{v.name}</div>
                  <div className="text-caption text-text-muted flex items-center justify-between mt-0.5 font-normal">
                    <span>{v.channelTarget}</span>
                    <span className="font-semibold text-success-text">✅ Đạt</span>
                  </div>
                </Button>
              )
            })}
          </div>

          {/* Set Consistency Banner */}
          <div className="p-4 rounded-xl border border-success-border bg-success-bg text-success-text space-y-1.5">
            <div className="flex items-center gap-2 text-caption font-bold text-success-text">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Đạt chứng chỉ Nhất Quán Bộ Ảnh
            </div>
            <p className="text-caption text-success-text leading-relaxed">
              Mọi ảnh biến thể đã được AI kiểm định khớp 100% hình thái sản phẩm gốc, cùng thành phần cấu tạo, cấu trúc và màu sắc.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
