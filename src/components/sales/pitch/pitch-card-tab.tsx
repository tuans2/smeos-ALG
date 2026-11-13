"use client"

import React from "react"
import { Eye } from "@/components/ui/icon-set/eye"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Pencil } from "@/components/ui/icon-set/pencil"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Button } from "@/components/ui/button"
import { SalesPitchCardA6 } from "@/components/templates/product-analysis"
import type { SalesPitchData } from "@/modules/products/domain/sales-pitch-template"

export interface PitchCardTabProps {
  cardRef: React.RefObject<HTMLDivElement | null>
  activePitch: SalesPitchData
  status: "DRAFT" | "FINALIZED"
  cardFormat: "a6" | "square" | "story"
  setCardFormat: (format: "a6" | "square" | "story") => void
  cardTheme: "classic" | "minimal" | "festive"
  setCardTheme: (theme: "classic" | "minimal" | "festive") => void
  exportSuccess: string | null
  exportError: string | null
  onOpenEdit: () => void
  onOpenOrderModal: () => void
  onOpenScript: () => void
}

export function PitchCardTab({
  cardRef,
  activePitch,
  status,
  cardFormat,
  setCardFormat,
  cardTheme,
  setCardTheme,
  exportSuccess,
  exportError,
  onOpenEdit,
  onOpenOrderModal,
  onOpenScript,
}: PitchCardTabProps) {
  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between px-1">
        <span className="text-caption font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
          <Eye size={14} className="text-primary" />
          Bản xem trước Thẻ Chào Khách (Khổ A6 / Share Card)
        </span>
        {status === "FINALIZED" && (
          <span className="text-caption font-semibold text-success">
            Đã chốt duyệt Final
          </span>
        )}
      </div>

      {/* Notification messages */}
      {exportSuccess && (
        <div className="rounded-xl bg-success/10 border border-success/25 p-3 text-caption font-medium text-success flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}
      {exportError && (
        <div className="rounded-xl bg-danger/10 border border-danger/25 p-3 text-caption font-medium text-danger flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Thanh lựa chọn Kích thước & Phong cách thiết kế thẻ (Công cụ 03) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-surface border border-border p-2.5 shadow-xs">
        {/* Bộ chọn Tỷ lệ / Kích thước */}
        <div className="flex items-center gap-1.5">
          <span className="text-caption font-bold text-text-muted uppercase tracking-wider pl-1">
            Kích thước:
          </span>
          <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-border">
            {[
              { id: "a6" as const, label: "Bưu thiếp A6", title: "Khổ bưu thiếp chuẩn A6 (105x148mm)" },
              { id: "square" as const, label: "Vuông 1:1", title: "Khổ vuông 1:1 - tối ưu gửi chat Zalo / Messenger" },
              { id: "story" as const, label: "Story", title: "Khổ dọc dạng Story / Nhật ký Zalo" },
            ].map((f) => (
              <Button variant="ghost"
                type="button"
                key={f.id}
                onClick={() => setCardFormat(f.id)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 inline-block px-2.5 py-1 text-caption font-semibold rounded-lg transition-all cursor-pointer ${
                  cardFormat === f.id
                    ? "bg-surface text-primary shadow-xs font-bold"
                    : "text-text-muted hover:text-text"
                }`}
                title={f.title}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Bộ chọn Phong cách màu sắc */}
        <div className="flex items-center gap-1.5">
          <span className="text-caption font-bold text-text-muted uppercase tracking-wider pl-1">
            Giao diện:
          </span>
          <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-border">
            {[
              { id: "classic" as const, label: "Tiêu chuẩn" },
              { id: "minimal" as const, label: "Tối giản" },
              { id: "festive" as const, label: "Lễ hội" },
            ].map((t) => (
              <Button variant="ghost"
                type="button"
                key={t.id}
                onClick={() => setCardTheme(t.id)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 inline-block px-2 py-1 text-caption font-semibold rounded-lg transition-all cursor-pointer ${
                  cardTheme === t.id
                    ? "bg-surface text-primary shadow-xs font-bold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <SalesPitchCardA6
        ref={cardRef}
        activePitch={activePitch}
        status={status}
        cardFormat={cardFormat}
        theme={cardTheme}
      />

      {/* Quick navigation at bottom of card */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenEdit}
          className="text-caption font-semibold gap-1 text-text hover:text-primary"
        >
          <Pencil size={13} />
          Chỉnh sửa thông tin
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenOrderModal}
          className="text-caption font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/5"
        >
          <ShoppingBag size={14} />
          Tạo đơn hàng từ mẫu này
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenScript}
          className="text-caption font-semibold gap-1 text-text hover:text-primary"
        >
          <FileText size={13} />
          Xem Kịch bản Zalo →
        </Button>
      </div>
    </div>
  )
}
