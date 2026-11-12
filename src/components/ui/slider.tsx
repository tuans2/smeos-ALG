"use client"

import * as React from "react"
import { Slider as BaseSlider } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

/**
 * Thanh trượt chuẩn (Đợt 4, D4-08 — thay `<input type="range">`, lint R18). Bọc `@base-ui/react/slider`
 * (đã có trong dự án, không thêm phụ thuộc): bàn phím (mũi tên, Page Up/Down, Home/End), `role="slider"` qua
 * input ẩn, giá trị đọc được bằng `getValueText`.
 * Vùng bấm: khung điều khiển cao 24px (44px khi màn cảm ứng); nút kéo 20px.
 * Bắt buộc có nhãn truy cập `aria-label` (gắn vào input ẩn của nút kéo).
 */
export type SliderProps = {
  "aria-label": string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  id?: string
  /** Chữ đọc cho trình đọc màn hình, vd "15 phút" thay vì "15" */
  getValueText?: (value: number) => string
  className?: string
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  id,
  getValueText,
  className,
  "aria-label": ariaLabel,
}: SliderProps) {
  return (
    <BaseSlider.Root
      value={value}
      onValueChange={(v) => onValueChange(Array.isArray(v) ? (v[0] ?? min) : (v as number))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn("w-full", disabled && "opacity-40", className)}
    >
      <BaseSlider.Control className="relative flex h-6 w-full touch-none items-center [@media(pointer:coarse)]:h-11 data-[disabled]:cursor-not-allowed">
        <BaseSlider.Track className="relative h-1.5 w-full rounded-full bg-border">
          <BaseSlider.Indicator className="absolute h-full rounded-full bg-primary" />
          <BaseSlider.Thumb
            id={id}
            getAriaLabel={() => ariaLabel}
            getAriaValueText={getValueText ? (_formatted: string, v: number) => getValueText(v) : null}
            className="block h-5 w-5 rounded-full border-2 border-primary bg-surface shadow-sm transition-shadow outline-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary data-[dragging]:shadow-md"
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
