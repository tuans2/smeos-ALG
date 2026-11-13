"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Sparkles, SlidersHorizontal, ArrowRight } from "@/components/ui/icons"

import { useI18n } from "@/lib/i18n"

export type CatalogExecutionMode = "autonomous" | "guided"

interface CatalogJourneyEntryProps {
  onSelectMode: (mode: CatalogExecutionMode) => void
}

export function CatalogJourneyEntry({ onSelectMode }: CatalogJourneyEntryProps) {
  const { ti, industry } = useI18n()
  const sampleName = industry?.aiConfig?.sampleProductNames?.[0] || `${ti("sampleProduct")} đặc trưng`

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-title-sm font-semibold text-text">Cách tạo {ti("catalogTitle")}</h2>

      {/* 2 Mode Cards — cân bằng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
        {/* Card ⚡ Autonomous */}
        <Button variant="ghost"
          type="button"
          onClick={() => onSelectMode("autonomous")}
          className="h-auto text-[length:inherit] justify-start font-[inherit] group flex flex-col gap-3 p-5 rounded-2xl border-2 border-primary bg-primary-muted/10 text-left transition-all hover:bg-primary-muted/25 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-surface shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="space-y-1.5">
            <div className="text-title font-extrabold text-text">AI làm cho tôi</div>
            <p className="text-body-sm text-text-muted leading-relaxed">
              Gõ một dòng ghi chú — ví dụ "{sampleName}".
              AI tự lọc, nhóm {ti("sampleProduct")}, chọn phong cách và tạo danh mục hoàn chỉnh.
            </p>
          </div>

          <div className="border-t border-primary-border pt-3 space-y-1">
            <div className="text-caption font-semibold text-primary flex items-center gap-1.5">
              <span>✓</span>
              <span>Xong trong vài chục giây</span>
            </div>
            <div className="text-caption font-semibold text-primary flex items-center gap-1.5">
              <span>✓</span>
              <span>Bạn kiểm tra và chỉnh trước khi chia sẻ</span>
            </div>
          </div>

          <div className="w-full py-2.5 rounded-lg bg-primary text-surface text-body-sm font-semibold text-center group-hover:bg-primary-dark transition-colors">
            Chọn chế độ này
          </div>
        </Button>

        {/* Card 🛠️ Guided */}
        <Button variant="ghost"
          type="button"
          onClick={() => onSelectMode("guided")}
          className="h-auto text-[length:inherit] justify-start font-[inherit] group flex flex-col gap-3 p-5 rounded-2xl border-2 border-border bg-surface text-left transition-all hover:border-border-hover hover:bg-surface-alt/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-surface-alt flex items-center justify-center text-text shrink-0">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="space-y-1.5">
            <div className="text-title font-extrabold text-text">Tôi muốn tự chọn từng bước</div>
            <p className="text-body-sm text-text-muted leading-relaxed">
              Tự chọn sản phẩm từ kho, lọc theo dịp và giá, tự chọn phong cách
              layout và viết lời giới thiệu theo ý muốn.
            </p>
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <div className="text-caption font-semibold text-text-muted flex items-center gap-1.5">
              <span>✓</span>
              <span>Kiểm soát hoàn toàn danh sách sản phẩm</span>
            </div>
            <div className="text-caption font-semibold text-text-muted flex items-center gap-1.5">
              <span>✓</span>
              <span>Phù hợp cho catalog có cấu trúc đặc biệt</span>
            </div>
          </div>

          <div className="w-full py-2.5 rounded-lg border border-border bg-surface text-text text-body-sm font-semibold text-center group-hover:bg-surface-alt transition-colors">
            Chọn chế độ này
          </div>
        </Button>
      </div>

      <p className="text-caption text-text-muted">
        Bạn có thể đổi chế độ bất kỳ lúc nào trong quá trình thiết lập.
      </p>
    </div>
  )
}
