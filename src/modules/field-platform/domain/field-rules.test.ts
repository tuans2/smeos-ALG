import { describe, expect, it } from "vitest"
import { INTERNAL_ONLY_VISIBILITY, type CoreFieldDefinition } from "./core-field-registry"
import {
  computeEffectiveFieldConfig,
  computeEffectiveCatalogValue,
  assertCustomFieldCountWithinLimit,
  assertDataTypeChangeAllowed,
  slugifyCustomFieldKey,
  assertCustomFieldKeyNotReserved,
  MAX_CUSTOM_FIELDS_PER_ENTITY,
} from "./field-rules"

const unitPriceVnd: CoreFieldDefinition = {
  key: "unitPriceVnd",
  entity: "ORDER",
  dataType: "MONEY_VND",
  label: "Giá bán cho khách",
  requirement: "REQUIRED",
  requiredAtStage: "INTAKE",
  visibility: INTERNAL_ONLY_VISIBILITY,
  sensitivity: "NORMAL",
  floorInternalOnly: true,
}

const cardMessage: CoreFieldDefinition = {
  key: "cardMessage",
  entity: "ORDER",
  dataType: "LONG_TEXT",
  label: "Lời thiệp",
  requirement: "RECOMMENDED",
  visibility: { INTERNAL: true, PARTNER: true, SHIPPER: false, CUSTOMER: false },
  sensitivity: "NORMAL",
}

describe("field-rules — mức sàn không cấu hình được (Đặc tả trường §16.2)", () => {
  it("floorInternalOnly: cấu hình không mở được PARTNER/SHIPPER/CUSTOMER", () => {
    const effective = computeEffectiveFieldConfig(unitPriceVnd, {
      fieldKey: "unitPriceVnd",
      visibility: { PARTNER: true, SHIPPER: true, CUSTOMER: true },
    })
    expect(effective.visibility).toEqual(INTERNAL_ONLY_VISIBILITY)
  })

  it("mức sàn #2: không hạ được mức yêu cầu REQUIRED xuống OPTIONAL", () => {
    const effective = computeEffectiveFieldConfig(unitPriceVnd, {
      fieldKey: "unitPriceVnd",
      requirement: "OPTIONAL",
    })
    expect(effective.requirement).toBe("REQUIRED")
    expect(effective.isEnabled).toBe(true)
  })

  it("nâng mức yêu cầu (RECOMMENDED → REQUIRED) là hợp lệ", () => {
    const effective = computeEffectiveFieldConfig(cardMessage, {
      fieldKey: "cardMessage",
      requirement: "REQUIRED",
    })
    expect(effective.requirement).toBe("REQUIRED")
  })

  it("không có ghi đè thì dùng nguyên lớp mã", () => {
    const effective = computeEffectiveFieldConfig(cardMessage, null)
    expect(effective.label).toBe("Lời thiệp")
    expect(effective.requirement).toBe("RECOMMENDED")
    expect(effective.visibility.PARTNER).toBe(true)
  })

  it("trường OPTIONAL/RECOMMENDED tắt được qua isEnabled", () => {
    const effective = computeEffectiveFieldConfig(cardMessage, {
      fieldKey: "cardMessage",
      isEnabled: false,
    })
    expect(effective.isEnabled).toBe(false)
  })

  it("nhãn ghi đè theo tổ chức có hiệu lực", () => {
    const effective = computeEffectiveFieldConfig(cardMessage, {
      fieldKey: "cardMessage",
      label: "Nội dung thiệp",
    })
    expect(effective.label).toBe("Nội dung thiệp")
  })

  it("mức sàn #3: giá trị danh mục chỉ tắt (isActive), không xoá", () => {
    const effective = computeEffectiveCatalogValue(
      { code: "URGENT", label: "Gấp", sortOrder: 2, isActive: true, behavior: "TIER_3", params: null },
      { catalogKey: "priority", code: "URGENT", isEnabled: false }
    )
    expect(effective.isActive).toBe(false)
    expect(effective.code).toBe("URGENT") // mã không đổi
  })
})

describe("field-rules — giới hạn trường tự tạo (§16.3)", () => {
  it("chặn khi đã đạt tối đa số trường tự tạo cho một thực thể", () => {
    expect(() => assertCustomFieldCountWithinLimit(MAX_CUSTOM_FIELDS_PER_ENTITY)).toThrow(/tối đa/)
    expect(() => assertCustomFieldCountWithinLimit(MAX_CUSTOM_FIELDS_PER_ENTITY - 1)).not.toThrow()
  })

  it("chặn đổi kiểu dữ liệu khi đã có giá trị", () => {
    expect(() => assertDataTypeChangeAllowed(true)).toThrow(/Không đổi được kiểu dữ liệu/)
    expect(() => assertDataTypeChangeAllowed(false)).not.toThrow()
  })

  it("sinh khoá cf_ từ nhãn tiếng Việt có dấu", () => {
    expect(slugifyCustomFieldKey("Mã PO khách")).toBe("cf_ma_po_khach")
    expect(slugifyCustomFieldKey("Đơn giá đặc biệt")).toBe("cf_don_gia_dac_biet")
  })

  it("chặn khoá tự tạo trùng khoá lõi hoặc không đúng tiền tố cf_", () => {
    const coreKeys = new Set(["customerPhone"])
    expect(() => assertCustomFieldKeyNotReserved("customerPhone", coreKeys)).toThrow(/trùng/)
    expect(() => assertCustomFieldKeyNotReserved("customerPhone", new Set())).toThrow(/cf_/)
    expect(() => assertCustomFieldKeyNotReserved("cf_ma_po", coreKeys)).not.toThrow()
  })
})
