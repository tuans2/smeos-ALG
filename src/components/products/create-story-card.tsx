"use client"

import { InfoTip } from "@/components/ui/info-tip"
import React from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"
import type { TerminologyGetter } from "./create-product-types"

interface CreateStoryCardProps {
  ti: TerminologyGetter
  industry: IndustryPluginContract
  description: string
  setDescription: (v: string) => void
}

export function CreateStoryCard({
  ti,
  industry,
  description,
  setDescription,
}: CreateStoryCardProps) {
  const placeholder = (() => {
    switch (industry.identity.key) {
      case "FASHION":
        return "Mô tả ý tưởng thiết kế, chất liệu sợi dệt, hướng dẫn bảo quản giữ phom dáng hoặc câu chuyện bộ sưu tập..."
      case "FNB":
        return "Mô tả hương vị món ăn, công thức chế biến đặc trưng, nguồn gốc nguyên liệu tươi sạch..."
      case "CRAFT_GIFT":
        return "Mô tả câu chuyện chế tác, chất liệu thủ công, ý nghĩa tặng thưởng và hướng dẫn bảo quản sản phẩm..."
      case "RETAIL_GENERAL":
        return "Mô tả đặc điểm nổi bật, thông tin xuất xứ, hướng dẫn sử dụng và bảo quản hàng hóa..."
      case "SERVICES":
        return "Mô tả trải nghiệm dịch vụ, quy trình thực hiện, lợi ích mang lại và cam kết chất lượng..."
      case "HOMESTAY":
        return "Mô tả không gian nghỉ dưỡng, tiện nghi đặc biệt, view cảnh quan và trải nghiệm lưu trú đáng nhớ..."
      default:
        return "Mô tả ý nghĩa sản phẩm, cảm xúc gửi gắm hoặc hướng dẫn chăm sóc giúp sản phẩm lâu…"
    }
  })()

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-title-sm font-bold text-text">
            <Sparkles size={18} className="text-primary" />
            <span>Câu chuyện và thông điệp {ti("sampleProduct").toLowerCase()}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-surface-alt text-text-muted border border-border">
              <Sparkles size={13} aria-hidden="true" className="inline" /> Nội dung AI hỗ trợ
            </span>
            <InfoTip label="Nội dung AI">Có thể do AI phân tích, gợi ý hoặc chủ cửa hàng viết — không ràng buộc giao kèo pháp lý.</InfoTip>
          </div>
        </div>
      </div>
      <div>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={placeholder}
          className="text-body-sm"
        />
      </div>
    </Card>
  )
}
