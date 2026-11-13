"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { ADDRESS_PART_MAX } from "@/modules/greeting-card/domain/delivery-address"

const OTHER = "__other__"

/**
 * Ô chọn từ danh sách; không có trong danh sách → "Khác (tự nhập)" mở ô gõ tay.
 * Danh sách rỗng (chưa chọn cấp trên / tải lỗi) → ô gõ tay luôn.
 */
export function PickOrTypeField(props: {
  id: string
  label: string
  value: string
  options: string[]
  placeholder: string
  pickPlaceholder: string
  inputClassName: string
  required?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const { id, label, value, options, placeholder, pickPlaceholder, inputClassName, required = false, disabled = false, onChange } = props
  const [typing, setTyping] = useState(false)
  const inList = !value || options.includes(value)
  const showInput = options.length === 0 || typing || !inList

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-caption font-semibold text-text-muted">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {showInput ? (
        <div className="flex flex-col gap-1">
          <Input
            id={id}
            type="text"
            required={required}
            disabled={disabled}
            maxLength={ADDRESS_PART_MAX}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
          />
          {options.length > 0 && (
            <Button variant="ghost" type="button" onClick={() => { setTyping(false); onChange("") }} className="h-auto p-0 gap-0 self-start text-caption font-medium text-primary hover:underline">
              Chọn từ danh sách
            </Button>
          )}
        </div>
      ) : (
        <NativeSelect
          id={id}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            if (e.target.value === OTHER) { setTyping(true); onChange("") } else onChange(e.target.value)
          }}
          className={inputClassName}
        >
          <option value="">{pickPlaceholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value={OTHER}>Khác (tự nhập)…</option>
        </NativeSelect>
      )}
    </div>
  )
}
