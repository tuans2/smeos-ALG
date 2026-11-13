import { describe, expect, it } from "vitest"
import {
  assertUniqueKeys,
  validateCoreFieldDefinition,
  listByEntity,
  findByKey,
  INTERNAL_ONLY_VISIBILITY,
  type CoreFieldDefinition,
} from "./core-field-registry"
import { ALL_CORE_FIELD_DEFINITIONS } from "./all-core-fields"

describe("core-field-registry — Sổ đăng ký trường lõi bằng code (3.2)", () => {
  it("mọi trường lõi hiện có đều tự hợp lệ (không PII/SENSITIVE mở PARTNER, không floorInternalOnly bị mở)", () => {
    for (const def of ALL_CORE_FIELD_DEFINITIONS) {
      expect(validateCoreFieldDefinition(def)).toEqual([])
    }
  })

  it("PII mở cho SHIPPER là HỢP LỆ (giao hàng cần SĐT/địa chỉ người nhận) — chỉ PARTNER mới bị chặn", () => {
    const shipperNeedsIt: CoreFieldDefinition = {
      key: "recipientPhoneTest",
      entity: "ORDER",
      dataType: "PHONE",
      label: "SĐT người nhận (test)",
      requirement: "REQUIRED",
      visibility: { INTERNAL: true, PARTNER: false, SHIPPER: true, CUSTOMER: false },
      sensitivity: "PII",
    }
    expect(validateCoreFieldDefinition(shipperNeedsIt)).toEqual([])

    const partnerLeak: CoreFieldDefinition = { ...shipperNeedsIt, key: "leakTest", visibility: { ...shipperNeedsIt.visibility, PARTNER: true } }
    expect(validateCoreFieldDefinition(partnerLeak).length).toBeGreaterThan(0)
  })

  it("không khoá nào trùng nhau trong toàn bộ sổ", () => {
    expect(() => assertUniqueKeys(ALL_CORE_FIELD_DEFINITIONS)).not.toThrow()
  })

  it("phát hiện định nghĩa sai: requiredAtStage nhưng requirement không phải REQUIRED", () => {
    const bad: CoreFieldDefinition = {
      key: "x",
      entity: "ORDER",
      dataType: "TEXT",
      label: "X",
      requirement: "OPTIONAL",
      requiredAtStage: "INTAKE",
      visibility: INTERNAL_ONLY_VISIBILITY,
      sensitivity: "NORMAL",
    }
    expect(validateCoreFieldDefinition(bad).length).toBeGreaterThan(0)
  })

  it("listByEntity và findByKey lọc đúng", () => {
    const orderFields = listByEntity(ALL_CORE_FIELD_DEFINITIONS, "ORDER")
    expect(orderFields.every((f) => f.entity === "ORDER")).toBe(true)
    expect(findByKey(ALL_CORE_FIELD_DEFINITIONS, "customerPhone")?.sensitivity).toBe("PII")
    expect(findByKey(ALL_CORE_FIELD_DEFINITIONS, "khong_ton_tai")).toBeUndefined()
  })
})
