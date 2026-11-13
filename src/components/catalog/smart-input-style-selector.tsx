"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Sparkles, Palette, Check } from "@/components/ui/icons"
import type { CatalogTemplateId, CatalogStyleId } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

export type PreferredStyleChoice = "auto" | {
  styleId: CatalogStyleId
  templateId: CatalogTemplateId
}

interface SmartInputStyleSelectorProps {
  selectedChoice: PreferredStyleChoice
  onSelectChoice: (choice: PreferredStyleChoice) => void
}

interface StyleCardItem {
  id: "auto" | CatalogStyleId
  templateId?: CatalogTemplateId
  name: string
  subtitle: string
  badge?: string
  palette?: string[]
}

const STYLE_CARDS: StyleCardItem[] = [
  {
    id: "auto",
    name: "AI Tự Động Đề Xuất",
    subtitle: "Dựa trên nội dung & ảnh sản phẩm",
    badge: "Khuyên dùng",
  },
  {
    id: "S01_EDITORIAL_MAGAZINE",
    templateId: "T01_SIGNATURE_COLLECTION",
    name: "Tạp chí thời trang",
    subtitle: "Tạp chí thời trang, ảnh lớn 4:5",
    palette: ["#FAF8F5", "#9A3412", "#1C1917"],
  },
  {
    id: "S02_PURE_MINIMAL",
    templateId: "T02_MINIMAL_PRODUCT_LIST",
    name: "Tối giản",
    subtitle: "Tối giản Bắc Âu, lưới duyệt nhanh",
    palette: ["#FFFFFF", "#18181B", "#71717A"],
  },
  {
    id: "S03_QUIET_LUXURY",
    templateId: "T03_PREMIUM_LOOKBOOK",
    name: "Sang trọng nhẹ nhàng",
    subtitle: "Sách ảnh tông ấm, sang trọng tĩnh lặng",
    palette: ["#F7F5F0", "#B45309", "#292524"],
  },
  {
    id: "S08_BENTO_GALLERY",
    templateId: "T04_BENTO_SHOWCASE",
    name: "Lưới khối nổi bật",
    subtitle: "Khối Bento năng động, thịnh hành",
    badge: "Đang thịnh hành",
    palette: ["#F8FAFC", "#6366F1", "#0F172A"],
  },
  {
    id: "S11_DARK_SHOWCASE",
    templateId: "T05_DARK_CINEMATIC",
    name: "Nền tối điện ảnh",
    subtitle: "Nền đen huyền bí, spotlight cao cấp",
    palette: ["#09090B", "#F59E0B", "#FAFAFA"],
  },
]

export function SmartInputStyleSelector({
  selectedChoice,
  onSelectChoice,
}: SmartInputStyleSelectorProps) {
  const currentId = selectedChoice === "auto" ? "auto" : selectedChoice.styleId

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-body-sm font-bold text-text flex items-center gap-1.5">
          <Palette className="h-4 w-4 text-primary" />
          <span>4. Phong cách thiết kế Catalog (Tùy chọn)</span>
        </label>
        <span className="text-caption text-text-muted">
          {currentId === "auto"
            ? "Mặc định AI sẽ gợi ý phong cách phù hợp nhất"
            : "Đã chọn phong cách cố định"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STYLE_CARDS.map((item) => {
          const isSelected = currentId === item.id

          return (
            <Button variant="outline"
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "auto") {
                  onSelectChoice("auto")
                } else if (item.templateId) {
                  onSelectChoice({
                    styleId: item.id,
                    templateId: item.templateId,
                  })
                }
              }}
              className={`text-[length:inherit] font-[inherit] gap-0 relative rounded-xl p-2.5 text-left border transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                isSelected
                  ? "border-primary bg-primary-muted/30 shadow-xs ring-2 ring-primary/40 hover:bg-primary-muted/30"
                  : "border-border bg-surface hover:border-primary/40 hover:bg-surface-alt/40"
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-1 w-full">
                {item.id === "auto" ? (
                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Sparkles className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {item.palette?.map((c, i) => (
                      <span
                        key={i}
                        className="h-2.5 w-2.5 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}

                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "border-border bg-surface"
                  }`}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="mt-2 space-y-0.5">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-caption font-bold text-text truncate max-w-full">
                    {item.name}
                  </span>
                  {item.badge && (
                    <span className="text-caption font-bold px-1.5 py-0.5 rounded bg-warning-bg text-warning-text border border-warning-border">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-caption text-text-muted line-clamp-1 leading-tight">
                  {item.subtitle}
                </p>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
