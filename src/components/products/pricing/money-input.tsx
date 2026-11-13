"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { formatVndInput, parseVndInput } from "./pricing-form"

/** Ô nhập tiền: chỉ nhận số, tự chấm phân cách nghìn. */
export function MoneyInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(formatVndInput(parseVndInput(e.target.value)))}
      placeholder={placeholder}
      className="h-10 text-body-sm"
    />
  )
}
