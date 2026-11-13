import { describe, expect, it } from "vitest"
import { buildProductCsv, csvCell } from "../product-csv-export"

describe("product CSV export", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Hồng "đỏ", lớn')).toBe('"Hồng ""đỏ"", lớn"')
    expect(csvCell("a\nb")).toBe('"a\nb"')
    expect(csvCell(null)).toBe("")
  })

  it("neutralises spreadsheet formula injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)")
    expect(csvCell("@cmd")).toBe("'@cmd")
    expect(csvCell(-5)).toBe("-5")
  })

  it("adds BOM, Vietnamese status labels and drops price column without L5", () => {
    const rows = [{ code: "B01", name: "Bó hồng", category: null, status: "ACTIVE", price_vnd: 350000 }]
    const withPrice = buildProductCsv(rows, { includePrice: true })
    expect(withPrice.startsWith("﻿")).toBe(true)
    expect(withPrice).toContain("B01,Bó hồng,,Đang bán,350000")
    const noPrice = buildProductCsv(rows, { includePrice: false })
    expect(noPrice).not.toContain("Giá")
    expect(noPrice).not.toContain("350000")
  })
})
