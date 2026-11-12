"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { Cloud } from "@/components/ui/icon-set/cloud"
import { Zap } from "@/components/ui/icon-set/zap"
import { optimizationPriceKey } from "@/modules/media/domain/optimization-rules"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"

export interface EnhancerProviderOption {
  id: string
  name: string
  desc: string
  badge: string
  tone: "accent" | "neutral" | "success" | "warning" | "danger"
  icon: React.ElementType
}

/**
 * Chỉ những bộ máy worker `media.optimize` thật sự có — khớp
 * `OPTIMIZE_ENHANCER_PROVIDERS` (`src/modules/media/domain/optimization-rules.ts`),
 * route từ chối mã khác. Gemini/Replicate gỡ 25/09/2026: ở worker còn là stub
 * luôn lùi PIL. Nhà cung cấp lỗi thì worker lùi về Studio và ghi lý do.
 */
export const ENHANCER_PROVIDERS: EnhancerProviderOption[] = [
  {
    id: "auto",
    name: "Theo thứ tự ưu tiên của tiệm",
    desc: "Thử lần lượt theo thứ tự trong Cài đặt → Nhà cung cấp AI; lựa chọn nào lỗi thì chuyển sang lựa chọn kế tiếp, hết lựa chọn mới dùng phông có sẵn và hoàn phần chênh credit.",
    badge: "Khuyên dùng",
    tone: "success",
    icon: Sparkles,
  },
  {
    id: "photoroom",
    name: "Tách nền và phông studio",
    desc: "Tách nền, đặt lên phông studio trắng, đổ bóng, chỉnh sáng và làm nét. Không xoá logo chìm — cần xoá thì chọn \"Tách nền và phông có sẵn\".",
    badge: "Thương mại",
    tone: "success",
    icon: Sparkles,
  },
  {
    id: "fal_flux",
    name: "Dựng ảnh sản phẩm",
    desc: "Tách nền, dựng phông studio, hoà ánh sáng và làm nét gấp đôi. Không xoá logo chìm.",
    badge: "Cao cấp",
    tone: "accent",
    icon: Zap,
  },
  {
    id: "imagen",
    name: "Dựng phông theo mô tả",
    desc: "Dựng phông và chỉnh sáng theo mô tả; hệ thống kiểm lại để sản phẩm giữ nguyên. Không xoá logo chìm.",
    badge: "Dịch vụ AI",
    tone: "accent",
    icon: Cloud,
  },
  {
    id: "studio",
    name: "Tách nền và phông có sẵn (dự phòng)",
    desc: "Chạy trên hệ thống ALG: tách nền, xoá logo chìm, ghép phông có sẵn. Chất lượng thấp hơn các lựa chọn trên — dùng khi cần xoá logo chìm hoặc tiết kiệm.",
    badge: "Dự phòng",
    tone: "accent",
    icon: Sparkles,
  },
  {
    id: "openai",
    name: "Chỉnh ảnh giữ nguyên sản phẩm",
    desc: "Tạo nền mở rộng quanh sản phẩm; đôi khi sinh mảng màu không tự nhiên.",
    badge: "Dịch vụ AI",
    tone: "neutral",
    icon: Cloud,
  },
  {
    id: "local",
    name: "Làm nét trên hệ thống (miễn phí)",
    desc: "Làm nét ngay trên hệ thống ALG, không gửi ảnh ra ngoài.",
    badge: "Miễn phí",
    tone: "neutral",
    icon: Cpu,
  },
]

export interface EnhancerProviderSelectorProps {
  value: string
  onChange: (providerId: string) => void
  disabled?: boolean
}

export function EnhancerProviderSelector({
  value,
  onChange,
  disabled = false,
}: EnhancerProviderSelectorProps) {
  return (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="text-caption font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          <span>Cách xử lý ảnh</span>
        </div>
        <span className="text-caption text-text-muted">
          Mặc định: <strong className="text-primary font-semibold">Theo thứ tự ưu tiên của tiệm</strong>
        </span>
      </div>

      <RadioGroup
        aria-label="Cách xử lý ảnh"
        value={value}
        disabled={disabled}
        onValueChange={(v) => onChange(String(v))}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        {ENHANCER_PROVIDERS.map((provider) => {
          const isSelected = value === provider.id
          const Icon = provider.icon

          return (
            <label
              key={provider.id}
              className={`relative flex flex-col justify-between p-3 rounded-xl border-2 transition cursor-pointer select-none ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border bg-surface hover:border-text-muted/40"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <RadioGroupItem value={provider.id} className="flex-shrink-0" />
                  <Icon size={16} className={isSelected ? "text-primary flex-shrink-0" : "text-text-muted flex-shrink-0"} />
                  <span className="text-body-sm font-bold text-text truncate">
                    {provider.name}
                  </span>
                </div>
                <Badge tone={provider.tone} className="flex-shrink-0 text-caption px-2 py-0.5">
                  {provider.badge}
                </Badge>
              </div>

              <div className="text-caption leading-relaxed text-text-muted mt-2 pl-5.5">
                {provider.desc}
              </div>
              <div className="text-caption font-semibold text-text mt-1 pl-5.5">
                {costCreditForFeature(optimizationPriceKey({ enhancer_provider: provider.id }))} credit/lượt
                {optimizationPriceKey({ enhancer_provider: provider.id }) === "media.optimize.cloud" &&
                  " · nhà cung cấp lỗi thì hoàn phần chênh"}
              </div>
            </label>
          )
        })}
      </RadioGroup>
    </div>
  )
}
