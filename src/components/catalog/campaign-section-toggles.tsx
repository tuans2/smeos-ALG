"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Sliders } from "@/components/ui/icons"
import type { EnabledSectionsConfig } from "./landing-campaign-preview"

interface CampaignSectionTogglesProps {
  enabledSections: EnabledSectionsConfig
  onChange: React.Dispatch<React.SetStateAction<EnabledSectionsConfig>>
}

const SECTION_ITEMS = [
  { id: "story", label: "Triết lý nghệ nhân" },
  { id: "perks", label: "4 Cam kết vàng" },
  { id: "process", label: "Quy trình 3 bước" },
  { id: "gallery", label: "Khoảnh khắc xưởng hoa" },
  { id: "reviews", label: "Đánh giá khách hàng (chỉ hiện khi có đánh giá thật)" },
  { id: "faq", label: "Hỏi đáp" },
  { id: "lead", label: "Đăng ký nhận ưu đãi" },
]

export function CampaignSectionToggles({
  enabledSections,
  onChange,
}: CampaignSectionTogglesProps) {
  return (
    <div className="space-y-2">
      <label className="text-caption font-bold text-text flex items-center gap-1.5">
        <Sliders size={14} className="text-primary" />
        <span>Bước 5: Bật/Tắt các phân đoạn (8 Sections)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {SECTION_ITEMS.map((sec) => {
          const isEnabled = enabledSections[sec.id as keyof EnabledSectionsConfig]
          return (
            <Button variant="outline"
              key={sec.id}
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  [sec.id]: !prev[sec.id as keyof EnabledSectionsConfig],
                }))
              }
              className={`h-auto gap-0 px-3 py-1.5 rounded-xl border text-caption font-bold transition-all ${
                isEnabled
                  ? "border-primary bg-primary-muted/20 text-primary hover:bg-primary-muted/20"
                  : "border-border bg-surface text-text-muted opacity-60 hover:bg-surface"
              }`}
            >
              {isEnabled ? `✓ ${sec.label}` : `✕ ${sec.label}`}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
