import { describe, expect, it } from "vitest"
import { findMissingRequiredFields, canLeaveStage } from "./stage-transitions"
import type { EffectiveFieldConfig } from "./field-rules"

const configs: EffectiveFieldConfig[] = [
  {
    key: "customerPhone",
    entity: "ORDER",
    dataType: "PHONE",
    label: "SĐT người mua",
    requirement: "REQUIRED",
    requiredAtStage: "INTAKE",
    visibility: { INTERNAL: true, PARTNER: false, SHIPPER: false, CUSTOMER: false },
    isEnabled: true,
    sensitivity: "PII",
  },
  {
    key: "cardMessage",
    entity: "ORDER",
    dataType: "LONG_TEXT",
    label: "Lời thiệp",
    requirement: "RECOMMENDED",
    visibility: { INTERNAL: true, PARTNER: true, SHIPPER: false, CUSTOMER: false },
    isEnabled: true,
    sensitivity: "NORMAL",
  },
]

describe("stage-transitions — cổng chặn chuyển bước (3.10)", () => {
  it("thiếu customerPhone thì không rời được INTAKE", () => {
    const missing = findMissingRequiredFields(configs, "INTAKE", (key) => (key === "customerPhone" ? "" : "x"))
    expect(missing.map((m) => m.key)).toEqual(["customerPhone"])
    expect(canLeaveStage(configs, "INTAKE", (key) => (key === "customerPhone" ? "" : "x"))).toBe(false)
  })

  it("đủ dữ liệu thì rời bước được", () => {
    expect(canLeaveStage(configs, "INTAKE", () => "0900000000")).toBe(true)
  })

  it("trường RECOMMENDED (không requiredAtStage) không chặn chuyển bước", () => {
    const missing = findMissingRequiredFields(configs, "INTAKE", (key) => (key === "cardMessage" ? "" : "0900000000"))
    expect(missing).toEqual([])
  })

  it("trường bị tắt (isEnabled=false) không bị tính là thiếu", () => {
    const disabled = configs.map((c) => (c.key === "customerPhone" ? { ...c, isEnabled: false } : c))
    expect(canLeaveStage(disabled, "INTAKE", () => "")).toBe(true)
  })
})
