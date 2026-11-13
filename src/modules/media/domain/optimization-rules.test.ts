import { describe, expect, it } from "vitest"

import {
  canApproveOptimization,
  isGuardResult,
  isTerminalGuardStatus,
  parseIdentityGuardBlock,
  requiresWarningBeforeApprove,
} from "./optimization-rules"

const khoi = {
  identity_score: 0.96,
  color_score: 0.98,
  geometry_score: 0.95,
  component_consistency: 0.97,
  result: "GOOD",
  ly_do: ["Số lượng cẩm chướng đổi: 30 → 29"],
  provider: "openai",
  model_version: "gpt-x",
}

describe("optimization-rules (P9)", () => {
  it("REJECTED không vào được luồng duyệt, ba phán quyết kia thì được (YC-R5)", () => {
    expect(canApproveOptimization("SAFE")).toBe(true)
    expect(canApproveOptimization("GOOD")).toBe(true)
    expect(canApproveOptimization("WARNING")).toBe(true)
    expect(canApproveOptimization("REJECTED")).toBe(false)
  })

  it("chỉ WARNING mới đòi cảnh báo trước khi duyệt (YC-R6)", () => {
    expect(requiresWarningBeforeApprove("WARNING")).toBe(true)
    expect(requiresWarningBeforeApprove("SAFE")).toBe(false)
    expect(requiresWarningBeforeApprove("GOOD")).toBe(false)
    // REJECTED không duyệt được nên câu hỏi "có cần cảnh báo không" không đặt ra.
    expect(requiresWarningBeforeApprove("REJECTED")).toBe(false)
  })

  it("nhận đúng bốn phán quyết, từ chối chuỗi lạ", () => {
    expect(isGuardResult("SAFE")).toBe(true)
    expect(isGuardResult("PASS")).toBe(false)
    expect(isGuardResult(null)).toBe(false)
  })

  it("job chưa xong thì chưa phải trạng thái cuối", () => {
    expect(isTerminalGuardStatus("PENDING")).toBe(false)
    expect(isTerminalGuardStatus("PROCESSING")).toBe(false)
    expect(isTerminalGuardStatus("COMPLETED")).toBe(true)
    expect(isTerminalGuardStatus("FAILED")).toBe(true)
    expect(isTerminalGuardStatus("CANCELLED")).toBe(true)
  })

  it("đọc khối bốn điểm từ payload sự kiện guard", () => {
    const doc = parseIdentityGuardBlock(khoi)
    expect(doc?.result).toBe("GOOD")
    expect(doc?.identity_score).toBe(0.96)
    expect(doc?.provider).toBe("openai")
    expect(doc?.ly_do).toEqual(["Số lượng cẩm chướng đổi: 30 → 29"])
  })

  it("payload thiếu hoặc sai hình dạng trả null, không ném", () => {
    // Job chưa chạy tới bước Guard là bình thường, không phải lỗi.
    expect(parseIdentityGuardBlock(null)).toBeNull()
    expect(parseIdentityGuardBlock("chuỗi")).toBeNull()
    expect(parseIdentityGuardBlock({ ...khoi, result: "PASS" })).toBeNull()
    expect(parseIdentityGuardBlock({ ...khoi, identity_score: "cao" })).toBeNull()
    const thieu: Record<string, unknown> = { ...khoi }
    delete thieu.color_score
    expect(parseIdentityGuardBlock(thieu)).toBeNull()
  })

  it("ly_do lọc bỏ phần tử không phải chuỗi, provider vắng thì không bịa", () => {
    const doc = parseIdentityGuardBlock({ ...khoi, ly_do: ["a", 5, null], provider: undefined })
    expect(doc?.ly_do).toEqual(["a"])
    expect(doc?.provider).toBeUndefined()
  })
})
