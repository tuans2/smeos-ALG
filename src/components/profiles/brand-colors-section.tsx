"use client"

import React from "react"
import { Palette } from "@/components/ui/icon-set/palette"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isValidHexColor } from "@/modules/profiles/domain/profile-rules"
import { calculateContrastRatio } from "@/modules/organization/domain/brand-config"

/** Chữ trắng hoặc đen — chọn màu đọc rõ hơn trên nền thương hiệu (xem trước phải đúng như ấn phẩm thật). */
const readableOn = (bg: string) => (calculateContrastRatio("#FFFFFF", bg) >= calculateContrastRatio("#111827", bg) ? "#FFFFFF" : "#111827")

export interface BrandColors {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
}

interface ColorFieldConfig {
  key: keyof BrandColors
  label: string
  description: string
  defaultColor: string
}

export const COLOR_FIELDS: ColorFieldConfig[] = [
  {
    key: "primary_color",
    label: "Màu chủ đạo (Primary)",
    description: "Nút bấm, thanh tiêu đề, viền nổi bật",
    defaultColor: "#e11d48",
  },
  {
    key: "secondary_color",
    label: "Màu phụ (Secondary)",
    description: "Huy hiệu, thẻ phụ, nhãn trạng thái",
    defaultColor: "#fda4af",
  },
  {
    key: "accent_color",
    label: "Màu nhấn (Accent)",
    description: "Giá ưu đãi, thông báo sốt dẻo, ngôi sao đánh giá",
    defaultColor: "#f59e0b",
  },
  {
    key: "background_color",
    label: "Màu nền trang (Background)",
    description: "Nền E-Catalog, nền Landing Page",
    defaultColor: "#ffffff",
  },
  {
    key: "text_color",
    label: "Màu chữ chính (Text)",
    description: "Văn bản nội dung và tiêu đề chính",
    defaultColor: "#111827",
  },
]

export interface BrandColorsSectionProps {
  colors: BrandColors
  errors: Record<string, string>
  onColorChange: (key: keyof BrandColors, val: string) => void
  onResetDefault: () => void
}

export function BrandColorsSection({
  colors,
  errors,
  onColorChange,
  onResetDefault,
}: BrandColorsSectionProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">Bảng màu nhận diện thương hiệu (5 Mã Hex Cẩm nang hệ thống)</h3>
            <p className="text-caption text-text-muted">Áp dụng trực tiếp vào E-Catalog, Video Studio và Thẻ chào sản phẩm</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetDefault}
          className="flex items-center gap-1.5 text-caption text-text-muted hover:text-primary transition-colors"
        >
          <RefreshCw size={13} />
          <span>Mặc định cửa hàng</span>
        </Button>
      </div>

      {/* Live Color Preview Bar */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-surface-alt flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-caption font-semibold text-text-muted">Xem trước phối màu thương hiệu:</span>
        <div className="flex items-center gap-2">
          <div
            className="px-4 py-2 rounded-lg text-caption font-bold shadow-xs"
            style={{ backgroundColor: colors.primary_color, color: readableOn(colors.primary_color) }}
          >
            Nút chính
          </div>
          <div
            className="px-3 py-1.5 rounded-md text-caption font-semibold border"
            style={{
              backgroundColor: colors.secondary_color,
              color: colors.text_color,
              borderColor: colors.primary_color,
            }}
          >
            Huy hiệu
          </div>
          <div
            className="px-2.5 py-1 rounded text-caption font-extrabold"
            style={{ backgroundColor: colors.accent_color, color: readableOn(colors.accent_color) }}
          >
            Hot Sale
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COLOR_FIELDS.map((cfg) => {
          const currentVal = colors[cfg.key]
          const hasErr = Boolean(errors[cfg.key])

          return (
            <div key={cfg.key} className="rounded-xl border border-border/80 bg-surface-alt/40 p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-caption font-bold text-text">{cfg.label}</span>
                <div
                  className="h-5 w-5 rounded-full border border-black/10 shadow-xs"
                  style={{ backgroundColor: isValidHexColor(currentVal) ? currentVal : "#cccccc" }}
                />
              </div>
              <p className="text-caption text-text-muted mb-3 leading-tight">{cfg.description}</p>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  aria-label={`Chọn ${cfg.label.toLowerCase()}`}
                  value={isValidHexColor(currentVal) ? currentVal : "#000000"}
                  onChange={(e) => onColorChange(cfg.key, e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                />
                <Input
                  type="text"
                  value={currentVal}
                  onChange={(e) => onColorChange(cfg.key, e.target.value)}
                  placeholder="Mã màu HEX"
                  aria-label={`Mã màu ${cfg.label.toLowerCase()}`}
                  className={`flex-1 rounded-lg font-mono font-medium uppercase ${
                    hasErr ? "border-danger ring-1 ring-danger/20" : ""
                  }`}
                />
              </div>
              {hasErr && <p className="mt-1 text-caption text-danger">{errors[cfg.key]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
