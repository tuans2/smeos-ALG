"use client"

import React, { useState } from "react"
import { Pencil } from "@/components/ui/icon-set/pencil"
import { Eye } from "@/components/ui/icon-set/eye"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PitchGeneralTab, type PitchGeneralTabProps } from "./pitch-general-tab"
import { PitchBomTab, type PitchBomTabProps } from "./pitch-bom-tab"
import { PitchGiftsTab, type PitchGiftsTabProps } from "./pitch-gifts-tab"

export interface PitchInlineEditorProps {
  generalProps: PitchGeneralTabProps
  bomProps: PitchBomTabProps
  giftsProps: PitchGiftsTabProps
  status: "DRAFT" | "FINALIZED"
  onViewCard: () => void
  onFinalize: () => void
}

export function PitchInlineEditor({
  generalProps,
  bomProps,
  giftsProps,
  status,
  onViewCard,
  onFinalize,
}: PitchInlineEditorProps) {
  const [editTab, setEditTab] = useState<"general" | "bom" | "gifts">("general")

  return (
    <Card className="rounded-2xl border-2 border-primary/30 bg-surface p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Pencil size={18} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text">Chỉnh sửa thông tin thẻ chào</h3>
        </div>
        <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-border">
          {[
            { id: "general" as const, label: "1. Thông tin chung và giá" },
            { id: "bom" as const, label: "2. Thành phần hoa" },
            { id: "gifts" as const, label: "3. Quà tặng và cam kết" },
          ].map((t) => (
            <Button variant="ghost"
              type="button"
              key={t.id}
              onClick={() => setEditTab(t.id)}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 inline-block px-3 py-1 text-caption font-semibold rounded-lg transition-all cursor-pointer ${
                editTab === t.id ? "bg-surface shadow-xs text-primary font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {editTab === "general" && <PitchGeneralTab {...generalProps} />}
      {editTab === "bom" && <PitchBomTab {...bomProps} />}
      {editTab === "gifts" && <PitchGiftsTab {...giftsProps} />}

      {/* Bottom actions of the editor */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
        <span className="text-caption text-text-muted">
          Chỉnh sửa hoàn tất? Chuyển sang xem Thẻ Chào Khách hoặc xuất bản.
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewCard}
            className="text-caption font-semibold gap-1 text-primary hover:bg-primary/5 border-primary/30"
          >
            <Eye size={13} />
            Xem Thẻ chào khách →
          </Button>
          {status !== "FINALIZED" && (
            <Button
              size="sm"
              onClick={onFinalize}
              className="text-caption bg-success hover:bg-success/90 text-white font-bold"
            >
              <CheckCircle2 size={14} className="mr-1" />
              Chốt duyệt & Xuất bản Final
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
