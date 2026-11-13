"use client"

import { Switch } from "@/components/ui/switch"

/** Công tắc Đang dùng / Tắt — cùng kiểu công tắc ưu đãi trong ma trận ưu đãi. */
export function ActiveSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean | undefined
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={(next) => onChange(next)}
      aria-label={label}
      disabled={disabled}
    />
  )
}
