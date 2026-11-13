"use client"

import React from "react"
import { Heart } from "@/components/ui/icon-set/heart"
import { Award } from "@/components/ui/icon-set/award"
import { Tag } from "@/components/ui/icon-set/tag"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export type ContentAngle = "emotional" | "technical" | "promotional"

export interface AngleSelectorCardProps {
  selectedAngle: ContentAngle
  onSelectAngle: (angle: ContentAngle) => void
}

/**
 * AngleSelectorCard (Thẻ chọn góc tiếp cận nội dung M06)
 */
export function AngleSelectorCard({
  selectedAngle,
  onSelectAngle,
}: AngleSelectorCardProps) {
  const { ti } = useI18n()
  const angles = [
    {
      id: "emotional" as ContentAngle,
      icon: Heart,
      title: "Cảm xúc & Tình cảm",
      description: "Nhấn mạnh thông điệp yêu thương, kỷ niệm, gắn kết giữa người tặng và người nhận.",
    },
    {
      id: "technical" as ContentAngle,
      icon: Award,
      title: "Tay nghề & Đẳng cấp",
      description: `Làm nổi bật kỹ thuật ${ti("makerAction") || "chế tác"} chuyên nghiệp, chất lượng ${ti("rawMaterialItem") || "nguyên vật liệu"} và phối màu sang trọng.`,
    },
    {
      id: "promotional" as ContentAngle,
      icon: Tag,
      title: "Ưu đãi & Kêu gọi chốt đơn",
      description: "Tập trung quà tặng kèm (thiệp, banner), freeship, ưu đãi số lượng giới hạn.",
    },
  ]

  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div>
        <div className="text-caption font-semibold text-text-muted">Bước 2: Chọn góc độ tiếp cận (Đăng mạng xã hội Copywriting Angle)</div>
        <div className="text-title font-extrabold text-text">Chọn góc tiếp cận bài viết</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {angles.map((item) => {
          const isSelected = item.id === selectedAngle
          const Icon = item.icon
          return (
            <Button variant="ghost" type="button"
              key={item.id}
              onClick={() => onSelectAngle(item.id)}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col gap-2 ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-text-muted bg-surface"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isSelected ? "bg-primary text-white" : "bg-surface-alt text-text-muted"}`}>
                  <Icon size={16} />
                </div>
                <div className="text-caption font-bold text-text">{item.title}</div>
              </div>
              <span className="block text-caption text-text-muted leading-relaxed">
                {item.description}
              </span>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
