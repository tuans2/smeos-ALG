import { describe, expect, it } from "vitest"

import { getAllTools, type ToolDefinition } from "@/modules/toolkit/domain/toolkit-catalog"
import { getAssetHref, readinessOf } from "./asset-type"
import { ALL_ASSET_TYPES, getAssetTypeByCode, getAssetTypesByModule } from "./asset-types"

describe("Marketing Center Asset Registry (PO 01/11/2026)", () => {
  const allTools = getAllTools()
  const toolMap = new Map<number, ToolDefinition>(allTools.map((t) => [t.id, t]))

  it("chứa chính xác 92 asset không trùng mã", () => {
    expect(ALL_ASSET_TYPES.length).toBe(92)
    const codes = ALL_ASSET_TYPES.map((a) => a.code)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(92)
  })

  it("đúng 41 loại Sẵn khớp tài liệu và mỗi loại Sẵn đều có href", () => {
    const readyAssets = ALL_ASSET_TYPES.filter((asset) => {
      const tool = asset.toolId ? toolMap.get(asset.toolId) : null
      return readinessOf(asset, tool) === "READY"
    })

    expect(readyAssets.length).toBe(41)

    for (const asset of readyAssets) {
      const tool = asset.toolId ? toolMap.get(asset.toolId) : null
      const href = getAssetHref(asset, tool)
      expect(href, `Asset ${asset.code} (${asset.name}) phải có đường dẫn thao tác`).toBeTruthy()
      expect(typeof href).toBe("string")
      expect(href!.length).toBeGreaterThan(0)
    }

    const expectedReadyCodes = [
      "1", "2", "3", "4", "8", "9", "10", "11", "13",
      "18", "19", "21", "24", "25", "26", "27", "28", "29",
      "31", "32", "33", "48", "49", "50", "51", "52", "55",
      "58", "59", "60", "61", "62", "63", "64", "65", "66", "67",
      "68", "69", "72", "74",
    ]
    const actualReadyCodes = readyAssets.map((a) => a.code).sort((a, b) => Number(a) - Number(b))
    expect(actualReadyCodes).toEqual(expectedReadyCodes.sort((a, b) => Number(a) - Number(b)))
  })

  it("tên và mục đích là tiếng Việt, nhãn <= 5 từ, không chứa mã kỹ thuật", () => {
    const technicalJargonPattern = /\b[A-Z]\d{1,2}\b|fallback/i

    for (const asset of ALL_ASSET_TYPES) {
      const wordCount = asset.name.trim().split(/\s+/).length
      expect(
        wordCount,
        `Tên asset "${asset.name}" (${asset.code}) có ${wordCount} từ, phải <= 5 từ`,
      ).toBeLessThanOrEqual(5)

      expect(
        technicalJargonPattern.test(asset.name),
        `Tên asset "${asset.name}" (${asset.code}) không được chứa mã kỹ thuật`,
      ).toBe(false)

      expect(
        technicalJargonPattern.test(asset.purpose),
        `Mục đích asset "${asset.purpose}" (${asset.code}) không được chứa mã kỹ thuật`,
      ).toBe(false)
    }
  })

  it("mỗi asset có ít nhất 1 nơi dùng và ít nhất 1 nguồn đầu vào", () => {
    for (const asset of ALL_ASSET_TYPES) {
      expect(asset.destinations.length, `Asset ${asset.code} phải có nơi dùng`).toBeGreaterThanOrEqual(1)
      expect(asset.inputs.length, `Asset ${asset.code} phải có cấu hình đầu vào`).toBeGreaterThanOrEqual(1)
    }
  })

  it("các helper tra cứu theo mã và module hoạt động chuẩn xác", () => {
    const a1 = getAssetTypeByCode("1")
    expect(a1).toBeDefined()
    expect(a1?.name).toBe("Ảnh bìa sản phẩm")

    const brandAssets = getAssetTypesByModule("brand")
    expect(brandAssets.length).toBe(16)

    const contentAssets = getAssetTypesByModule("content")
    expect(contentAssets.length).toBe(28)

    const promoAssets = getAssetTypesByModule("promotion")
    expect(promoAssets.length).toBe(19)

    const salesAssets = getAssetTypesByModule("sales")
    expect(salesAssets.length).toBe(8)

    const careAssets = getAssetTypesByModule("care")
    expect(careAssets.length).toBe(11)

    const printAssets = getAssetTypesByModule("print")
    expect(printAssets.length).toBe(10)
  })
})
