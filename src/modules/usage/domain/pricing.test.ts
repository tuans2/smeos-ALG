import { describe, expect, it } from "vitest"

import { costCreditForFeature } from "./pricing"

describe("costCreditForFeature", () => {
  it("trả đúng giá đã biết", () => {
    expect(costCreditForFeature("vision.analyze")).toBe(1)
    expect(costCreditForFeature("media.optimize")).toBe(2)
  })

  it("feature lạ dùng giá mặc định, không ném lỗi", () => {
    expect(costCreditForFeature("mot.feature.chua-tung-thay")).toBe(1)
  })

  // Bảng giá v1 (25/09/2026) — nguyên tắc 2: nhà cung cấp = cục bộ + 1.
  it("đường nhà cung cấp ảnh đắt hơn đường cục bộ đúng 1 credit", () => {
    expect(costCreditForFeature("media.variant.cloud") - costCreditForFeature("media.variant")).toBe(1)
    expect(costCreditForFeature("media.optimize.cloud") - costCreditForFeature("media.optimize")).toBe(1)
  })

  it("chuỗi nhiều lời gọi mô hình đắt hơn một lời gọi", () => {
    expect(costCreditForFeature("content.generate")).toBeGreaterThan(costCreditForFeature("creative.scene_plan"))
  })
})
