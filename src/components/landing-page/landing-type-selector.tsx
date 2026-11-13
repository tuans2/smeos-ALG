import React from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  LANDING_TYPE_OPTIONS,
  type LandingPageType,
  type LandingTypeOption,
} from "@/modules/landing-page/domain/preset-catalog"

interface LandingTypeSelectorProps {
  selectedType: LandingPageType
  onSelectType: (type: LandingPageType) => void
  /** Giới hạn lựa chọn (nhóm Quảng bá chỉ giữ loại trang chiến dịch); mặc định đủ 4 loại */
  options?: readonly LandingTypeOption[] | undefined
}

/**
 * Mục đích trang — nhóm radio gọn (archetype E, UX-028). Giá trị được gửi cho AI soạn nội dung;
 * mô tả chỉ hiện cho lựa chọn đang chọn để không lặp 4 đoạn giới thiệu.
 */
export function LandingTypeSelector({ selectedType, onSelectType, options = LANDING_TYPE_OPTIONS }: LandingTypeSelectorProps) {
  const selected = options.find((o) => o.type === selectedType)

  return (
    <fieldset className="space-y-2">
      <legend className="text-body-sm font-semibold text-text">Mục đích trang</legend>
      <RadioGroup
        aria-label="Mục đích trang"
        value={selectedType}
        onValueChange={(v) => onSelectType(v as LandingPageType)}
        className="flex flex-wrap gap-2"
      >
        {options.map((opt) => {
          const isSelected = selectedType === opt.type
          return (
            <label
              key={opt.type}
              className={`relative cursor-pointer rounded-full border px-3.5 py-2 text-body-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${
                isSelected ? "border-primary bg-selected font-semibold text-selected-text" : "border-border bg-surface text-text hover:bg-surface-alt"
              }`}
            >
              <RadioGroupItem value={opt.type} className="absolute h-px w-px overflow-hidden border-0 opacity-0" />
              {opt.title}
            </label>
          )
        })}
      </RadioGroup>
      {selected && <p className="text-body-sm text-text-muted">{selected.subTitle}</p>}
    </fieldset>
  )
}
