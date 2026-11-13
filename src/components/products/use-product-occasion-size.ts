"use client"

import { useEffect, useMemo, useState } from "react"

interface OccasionOption {
  code: string
  name: string
}

/**
 * Dịp tặng và kích thước khi tạo mẫu (checklist ALG 2.1). Dịp lấy từ danh mục dịp của tiệm
 * (`/occasions`), lưu mã vào `attributes.occasionCodes` — cùng khoá bộ lọc dịp của danh sách sản
 * phẩm đang đọc; kích thước lưu `attributes.dimensions` theo quy ước Master Index (`heightCm`/`widthCm`).
 */
export function useProductOccasionSize() {
  const [occasions, setOccasions] = useState<OccasionOption[]>([])
  const [selectedNames, setSelectedNames] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [widthCm, setWidthCm] = useState("")
  /** Kiểu dáng tính phí chế tác ngày lễ (PO Q8, checklist ALG 3.6) */
  const [craftStyle, setCraftStyle] = useState("")

  useEffect(() => {
    fetch("/api/v1/occasions")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j: { data?: { code: string; name: string; is_active?: boolean }[] }) =>
        setOccasions((j.data ?? []).filter((o) => o.is_active !== false).map((o) => ({ code: o.code, name: o.name })))
      )
      .catch(() => setOccasions([]))
  }, [])

  const attributes = useMemo(() => {
    const names = selectedNames.split(",").map((s) => s.trim()).filter(Boolean)
    const occasionCodes = occasions.filter((o) => names.includes(o.name)).map((o) => o.code)
    const h = Number(heightCm)
    const w = Number(widthCm)
    return {
      ...(occasionCodes.length > 0 ? { occasionCodes } : {}),
      ...(h > 0 && w > 0 ? { dimensions: { heightCm: h, widthCm: w } } : {}),
      ...(craftStyle ? { craftStyle } : {}),
    }
  }, [occasions, selectedNames, heightCm, widthCm, craftStyle])

  return { occasions, selectedNames, setSelectedNames, heightCm, setHeightCm, widthCm, setWidthCm, craftStyle, setCraftStyle, attributes }
}

export type ProductOccasionSize = ReturnType<typeof useProductOccasionSize>
