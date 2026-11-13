import { describe, expect, it } from "vitest"
import type { ProductPatchPayload } from "@/components/products/ai-product-helpers"
import { buildSaveAsPayload, copyCodeSuffix } from "@/components/products/ai-product-save-as"

const base: ProductPatchPayload = {
  name: "Ke Hoa Vieng",
  code: "BST-030",
  category: "Hoa chia buồn",
  shape: null,
  facing: null,
  container: null,
  status: "ACTIVE",
  attributes: { price: null, price_vnd: null, description: null, color: null, bom: { flowers: [], materials: [] }, imageUrl: "u" },
  image_asset_id: "asset-1",
}

describe("buildSaveAsPayload", () => {
  it("giữ tên/mã gốc thì thêm hậu tố bản sao và mã mới, giữ trạng thái bán theo form", () => {
    const out = buildSaveAsPayload(base, { name: "Ke Hoa Vieng", code: "BST-030" }, "AB12C")
    expect(out.name).toBe("Ke Hoa Vieng (bản sao)")
    expect(out.code).toBe("BST-030-AB12C")
    expect(out.status).toBe("ACTIVE")
  })

  it("người dùng đã đổi tên và mã thì giữ nguyên", () => {
    const out = buildSaveAsPayload({ ...base, name: "Mới", code: "NEW-1" }, { name: "Ke Hoa Vieng", code: "BST-030" })
    expect(out.name).toBe("Mới")
    expect(out.code).toBe("NEW-1")
  })

  it("dùng chung ảnh với mẫu gốc", () => {
    const out = buildSaveAsPayload(base, { name: "x", code: "y" })
    expect(out.image_asset_id).toBe("asset-1")
    expect(out.attributes.imageUrl).toBe("u")
  })
})

describe("copyCodeSuffix", () => {
  it("trả về 5 ký tự in hoa", () => {
    expect(copyCodeSuffix(1_700_000_000_000)).toMatch(/^[0-9A-Z]{5}$/)
  })
})
