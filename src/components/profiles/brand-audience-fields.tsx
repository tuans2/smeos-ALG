"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * Thông điệp thương hiệu và khách mục tiêu (checklist ALG 9.3) — AI viết nội dung bán hàng đọc hai trường này.
 * Khách mục tiêu nhập cách nhau bằng dấu phẩy, tối đa 10 nhóm.
 */
export function BrandAudienceFields({
  brandMessage, onBrandMessage, audience, onAudience,
}: { brandMessage: string; onBrandMessage: (v: string) => void; audience: string; onAudience: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-caption font-semibold text-text">
        Thông điệp thương hiệu
        <Textarea rows={2} maxLength={500} value={brandMessage} onChange={(e) => onBrandMessage(e.target.value)} placeholder="Điều cửa hàng muốn khách nhớ về mình" aria-label="Thông điệp thương hiệu" />
        <span className="font-normal text-text-muted">AI dùng khi viết bài đăng và nội dung bán hàng</span>
      </label>
      <label className="flex flex-col gap-1.5 text-caption font-semibold text-text">
        Khách mục tiêu
        <Input value={audience} onChange={(e) => onAudience(e.target.value)} placeholder="Ví dụ: Văn phòng tặng sếp, Cặp đôi, Mẹ bỉm sữa" aria-label="Khách mục tiêu" />
        <span className="font-normal text-text-muted">Cách nhau bằng dấu phẩy, tối đa 10 nhóm</span>
      </label>
    </div>
  )
}

export const parseAudience = (v: string): string[] => v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10).map((s) => s.slice(0, 80))
