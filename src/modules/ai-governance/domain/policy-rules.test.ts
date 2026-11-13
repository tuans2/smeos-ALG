import { describe, expect, it } from "vitest"

import { requiresVisionEngineCapability, validateAiPolicyInput } from "./policy-rules"

const ok = {
  capability_code: "AIC-23",
  allowed_models: ["mo_hinh_a"],
  privacy_floor: "SHOP" as const,
}

describe("luật chính sách AI", () => {
  it("chính sách hợp lệ không sinh lỗi nào", () => {
    expect(validateAiPolicyInput(ok, ["mo_hinh_a", "mo_hinh_b"])).toEqual({})
  })

  it("mô hình không đủ điều kiện bị từ chối — gồm cả mô hình thiếu ô giấy phép", () => {
    const errors = validateAiPolicyInput({ ...ok, allowed_models: ["la_ai_the"] }, ["mo_hinh_a"])
    expect(errors.allowed_models).toContain("la_ai_the")
  })

  it("không hạ được sàn quyền riêng tư dưới sàn của chính năng lực", () => {
    const errors = validateAiPolicyInput(
      { capability_code: "AIC-29", allowed_models: [], privacy_floor: "SHOP" },
      []
    )
    expect(errors.privacy_floor).toContain("SENSITIVE")
  })

  it("năng lực tất định không có chính sách mô hình", () => {
    const errors = validateAiPolicyInput({ ...ok, capability_code: "AIC-16" }, ["mo_hinh_a"])
    expect(errors.capability_code).toContain("tất định")
  })

  it("năng lực ngoài sổ đăng ký bị từ chối", () => {
    const errors = validateAiPolicyInput({ ...ok, capability_code: "AIC-99" }, [])
    expect(errors.capability_code).toBe("Năng lực không có trong sổ đăng ký")
  })

  it("đổi năng lực phân tích ảnh đòi thêm H4, không chỉ U2", () => {
    expect(requiresVisionEngineCapability("AIC-01")).toBe(true)
    expect(requiresVisionEngineCapability("product_vision")).toBe(true)
    expect(requiresVisionEngineCapability("AIC-23")).toBe(false)
  })
})
