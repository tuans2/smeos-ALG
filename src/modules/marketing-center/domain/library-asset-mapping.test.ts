import { describe, expect, it } from "vitest"

import {
  assetTypeOfLibraryItem,
  resolveAssetDefinitionForLibraryItem,
} from "./library-asset-mapping"

describe("Library Item to Asset Type Mapping (PR-1)", () => {
  it("ưu tiên mã tường minh trong metadata.asset_type_code", () => {
    const code = assetTypeOfLibraryItem("ai_image", "MARKETING", { asset_type_code: "9" })
    expect(code).toBe("9")

    const def = resolveAssetDefinitionForLibraryItem("ai_image", "MARKETING", { asset_type_code: "9" })
    expect(def).toBeDefined()
    expect(def?.name).toBe("Áp phích ưu đãi")
  })

  it("suy luận chuẩn xác cho các LibraryType mặc định", () => {
    expect(assetTypeOfLibraryItem("catalog")).toBe("18")
    expect(resolveAssetDefinitionForLibraryItem("catalog")?.name).toBe("Danh mục sản phẩm")

    expect(assetTypeOfLibraryItem("greeting_catalog")).toBe("19")
    expect(assetTypeOfLibraryItem("greeting_catalog", "GIFT", { catalog_kind: "GIFT_COLLECTION" })).toBe("26")
    expect(assetTypeOfLibraryItem("greeting_catalog", "EVENT", { catalog_kind: "EVENT_COLLECTION" })).toBe("27")

    expect(assetTypeOfLibraryItem("landing", null, { page_type: "SHOWCASE_HIGHLIGHT" })).toBe("68")
    expect(assetTypeOfLibraryItem("landing", null, { page_type: "CAMPAIGN_SEASONAL" })).toBe("69")
    expect(assetTypeOfLibraryItem("landing", null, { page_type: "STORE_BRAND" })).toBe("TH13")

    expect(assetTypeOfLibraryItem("content")).toBe("4")
    expect(assetTypeOfLibraryItem("video")).toBe("38")
    expect(assetTypeOfLibraryItem("original")).toBe("1")
  })

  it("suy luận ảnh marketing theo ngữ cảnh khuyến mãi và tỉ lệ", () => {
    expect(assetTypeOfLibraryItem("ai_image", "MARKETING", { preset_type: "PROMOTION" })).toBe("9")
    expect(assetTypeOfLibraryItem("ai_image", "MARKETING", { preset_type: "BANNER_DISCOUNT" })).toBe("10")
    expect(assetTypeOfLibraryItem("ai_image", "MARKETING", { aspect_ratio: "16:9" })).toBe("11")
    expect(assetTypeOfLibraryItem("ai_image", "MARKETING", {})).toBe("8")
  })

  it("trả về null nếu loại thư viện không ánh xạ được", () => {
    expect(assetTypeOfLibraryItem("audio")).toBeNull()
    expect(resolveAssetDefinitionForLibraryItem("audio")).toBeNull()
  })
})

