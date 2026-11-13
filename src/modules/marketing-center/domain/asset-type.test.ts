import { describe, expect, it } from "vitest"

import type { ToolDefinition } from "@/modules/toolkit/domain/toolkit-catalog"
import {
  type AssetTypeDefinition,
  getAssetHref,
  getManualInputs,
  readinessOf,
} from "./asset-type"

describe("AssetType domain logic", () => {
  const dummyToolDone: ToolDefinition = {
    id: 1,
    name: "Ảnh sản phẩm",
    description: "Tách nền ảnh",
    icon: "Camera",
    label: "STORE",
    status: "DONE",
    progress: 100,
    href: "/cong-cu/anh-san-pham",
    statusNote: "Đã hoàn thành",
  }

  const dummyToolInProgress: ToolDefinition = {
    ...dummyToolDone,
    id: 6,
    status: "IN_PROGRESS",
    progress: 50,
  }

  it("tính readinessOf chuẩn xác theo trạng thái công cụ và fit", () => {
    const assetFull: AssetTypeDefinition = {
      code: "1",
      name: "Ảnh bìa sản phẩm",
      purpose: "Ảnh chính đại diện cho sản phẩm",
      module: "content",
      destinations: ["PROMOTION", "SALES"],
      toolId: 1,
      fit: "FULL",
      inputs: [{ label: "Ảnh chụp", source: "PRODUCT_PHOTO", required: true }],
      outputs: ["PNG"],
    }

    expect(readinessOf(assetFull, dummyToolDone)).toBe("READY")
    expect(readinessOf(assetFull, dummyToolInProgress)).toBe("EXTEND")
    expect(readinessOf(assetFull, null)).toBe("NEW")

    const assetPartial: AssetTypeDefinition = {
      ...assetFull,
      fit: "PARTIAL",
    }
    expect(readinessOf(assetPartial, dummyToolDone)).toBe("EXTEND")

    const assetNew: AssetTypeDefinition = {
      ...assetFull,
      toolId: null,
    }
    expect(readinessOf(assetNew, dummyToolDone)).toBe("NEW")
  })

  it("lấy href đúng thứ tự ưu tiên", () => {
    const assetWithoutCustomHref: AssetTypeDefinition = {
      code: "1",
      name: "Ảnh bìa sản phẩm",
      purpose: "Ảnh chính đại diện cho sản phẩm",
      module: "content",
      destinations: ["PROMOTION"],
      toolId: 1,
      fit: "FULL",
      inputs: [],
      outputs: [],
    }

    expect(getAssetHref(assetWithoutCustomHref, dummyToolDone)).toBe("/cong-cu/anh-san-pham")
    expect(getAssetHref(assetWithoutCustomHref, null)).toBeNull()

    const assetWithCustomHref: AssetTypeDefinition = {
      ...assetWithoutCustomHref,
      customHref: "/tai-anh?tab=m01c",
    }
    expect(getAssetHref(assetWithCustomHref, dummyToolDone)).toBe("/tai-anh?tab=m01c")
  })

  it("lọc đúng danh sách đầu vào cần nhập tay", () => {
    const inputs = [
      { label: "Tên shop", source: "STORE_PROFILE" as const, required: true },
      { label: "Màu sắc", source: "BRAND_PROFILE" as const, required: true },
      { label: "Ảnh gốc", source: "PRODUCT_PHOTO" as const, required: true },
      { label: "Ghi chú thêm", source: "MANUAL_TEXT" as const, required: false },
    ]

    const manual = getManualInputs(inputs)
    expect(manual.map((m) => m.label)).toEqual(["Ảnh gốc", "Ghi chú thêm"])
  })
})

