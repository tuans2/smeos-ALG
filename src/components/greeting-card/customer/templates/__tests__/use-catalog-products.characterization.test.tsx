import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Khoá hành vi (B5) trước khi bỏ ảnh kho khỏi sản phẩm mẫu của khung xem trước mẫu thẻ chào.
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ industry: null }) }))

import { useCatalogProducts } from "../use-catalog-products"

function Probe({ onResult }: { onResult: (r: ReturnType<typeof useCatalogProducts>) => void }) {
  onResult(useCatalogProducts())
  return null
}

const read = () => {
  let out: ReturnType<typeof useCatalogProducts> | null = null
  renderToStaticMarkup(<Probe onResult={(r) => (out = r)} />)
  return out!
}

describe("useCatalogProducts — chưa có bộ sưu tập", () => {
  it("trả sản phẩm mẫu theo ngành mặc định, không phải dữ liệu thật, không đang tải", () => {
    const r = read()
    expect(r.isRealData).toBe(false)
    expect(r.isLoading).toBe(false)
    expect(r.products.length).toBeGreaterThan(0)
    expect(r.products.every((p) => p.id.startsWith("sample-"))).toBe(true)
  })
})

describe("sản phẩm mẫu không dùng ảnh kho (PO 06/11/2026)", () => {
  it("ảnh sản phẩm mẫu để trống, giao diện hiện ảnh giữ chỗ", () => {
    expect(read().products.every((p) => !p.imageUrl)).toBe(true)
  })
})
