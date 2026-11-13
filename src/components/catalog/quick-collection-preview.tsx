"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { RefreshCw, Sparkles } from "@/components/ui/icons"
import type { QuickCollectionResult } from "@/modules/catalog-links/domain/quick-collection-engine"

/** Mẫu hoa đề xuất theo tiêu chí — xem trước trước khi tạo link; "Chọn mẫu khác" đổi bộ mẫu. */
export function QuickCollectionPreview({
  liveResult,
  hasFilter,
  onReshuffle,
}: {
  liveResult: QuickCollectionResult
  hasFilter: boolean
  onReshuffle: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption font-bold text-text flex items-center gap-1.5">
          <Sparkles size={13} className="text-accent-text" />
          Mẫu hoa đề xuất ({liveResult.selectedProducts.length} mẫu)
        </span>
        <div className="flex items-center gap-2">
          {liveResult.selectedProducts.length > 0 && (
            <Button variant="outline"
              type="button"
              onClick={onReshuffle}
              title="Chọn bộ mẫu khác"
              className="h-auto font-[inherit] flex items-center gap-1 px-2 py-0.5 rounded-lg border border-border bg-surface text-caption text-text-muted hover:border-primary/40 hover:text-primary transition-all hover:bg-surface"
            >
              <RefreshCw size={11} />
              Chọn mẫu khác
            </Button>
          )}
          <span className="text-caption text-text-muted">
            {liveResult.generatedName}
          </span>
        </div>
      </div>
      {liveResult.selectedProducts.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-border bg-surface-alt text-center space-y-1">
          <div className="text-caption font-bold text-text-muted">
            {hasFilter
              ? "🔍 Kho chưa có sản phẩm loại này"
              : "🔍 Chưa có mẫu phù hợp"}
          </div>
          <div className="text-caption text-text-muted">
            {hasFilter
              ? "Hãy bỏ chọn bộ lọc hoặc thêm sản phẩm loại này vào kho."
              : "Hãy thử đổi khoảng giá hoặc bớt bộ lọc."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {liveResult.selectedProducts.map((p) => (
            <div
              key={p.id}
              className="p-2 rounded-xl border border-border bg-surface flex items-center gap-2 hover:border-primary/40 transition-colors"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center shrink-0 text-text-muted text-caption">
                  🌸
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-caption font-bold text-text truncate">{p.name}</div>
                <div className="text-caption font-extrabold text-primary">
                  {p.price ? `${p.price.toLocaleString("vi-VN")} ₫` : "Liên hệ"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
