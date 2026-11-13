"use client"

import { Textarea } from "@/components/ui/textarea"
import React from "react"
import { Input } from "@/components/ui/input"
import type { AiField, AiFieldValues } from "./vision-suggestions"

const FIELDS: Array<{ key: AiField; label: string; placeholder: string }> = [
  { key: "components", label: "Thành phần hoa", placeholder: "VD: Hồng Juliet, Cát tường" },
  { key: "colors", label: "Màu chủ đạo", placeholder: "VD: Hồng pastel, Trắng" },
  { key: "style", label: "Phong cách", placeholder: "VD: Lãng mạn" },
  { key: "packaging", label: "Kiểu gói", placeholder: "VD: Giấy Hàn kem, ruy băng lụa" },
]

interface Props {
  values: AiFieldValues
  aiFilled: ReadonlySet<AiField>
  onChange: (field: AiField, value: string) => void
}

/** Các ô mô tả hoa — AI có thể điền sẵn (đánh dấu "AI gợi ý"), người dùng sửa thoải mái. */
export function QuickProductAiFields({ values, aiFilled, onChange }: Props) {
  const tag = (f: AiField) =>
    aiFilled.has(f) ? <span className="ml-1 text-caption font-medium text-primary">· AI gợi ý</span> : null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`qp-${f.key}`} className="block text-caption font-bold text-text mb-1">{f.label}{tag(f.key)}</label>
            <Input id={`qp-${f.key}`} value={values[f.key]} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder} className="h-9 text-caption" />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="qp-description" className="block text-caption font-bold text-text mb-1">Mô tả{tag("description")}</label>
        <Textarea
          id="qp-description"
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          rows={3}
          placeholder="Vài câu giới thiệu sản phẩm cho khách"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-caption text-text focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  )
}
