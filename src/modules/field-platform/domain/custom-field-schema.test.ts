import { describe, expect, it } from "vitest"
import { buildCustomFieldsSchema, validateCustomFieldsInput, type CustomFieldDefinitionInput } from "./custom-field-schema"

const poCode: CustomFieldDefinitionInput = {
  key: "cf_ma_po",
  dataType: "TEXT",
  requirement: "REQUIRED",
  status: "ACTIVE",
  validation: { maxLength: 30 },
}

const budget: CustomFieldDefinitionInput = {
  key: "cf_ngan_sach",
  dataType: "MONEY_VND",
  requirement: "OPTIONAL",
  status: "ACTIVE",
}

describe("custom-field-schema — trình kiểm tra động (3.5)", () => {
  it("thiếu trường REQUIRED thì báo lỗi", () => {
    const schema = buildCustomFieldsSchema([poCode])
    expect(schema.safeParse({}).success).toBe(false)
  })

  it("REQUIRED nhưng có requiredAtStage thì KHÔNG bắt buộc ngay (3.16) — cổng thật ở stage-transitions", () => {
    const deferredRequired: CustomFieldDefinitionInput = {
      ...poCode,
      key: "cf_giay_to_ban_giao",
      requiredAtStage: "DELIVERED",
    }
    const schema = buildCustomFieldsSchema([deferredRequired])
    expect(schema.safeParse({}).success).toBe(true)
    // vẫn kiểm kiểu/độ dài nếu CÓ gửi giá trị
    expect(schema.safeParse({ cf_giay_to_ban_giao: "x".repeat(31) }).success).toBe(false)
  })

  it("đủ dữ liệu hợp lệ thì qua", () => {
    const result = validateCustomFieldsInput([poCode, budget], { cf_ma_po: "PO-2026-001", cf_ngan_sach: 500000 })
    expect(result.cf_ma_po).toBe("PO-2026-001")
    expect(result.cf_ngan_sach).toBe(500000)
  })

  it("vượt độ dài validation thì lỗi", () => {
    const schema = buildCustomFieldsSchema([poCode])
    expect(schema.safeParse({ cf_ma_po: "x".repeat(31) }).success).toBe(false)
  })

  it("trường tự tạo INACTIVE không bị kiểm tra, và giá trị cũ đi qua nguyên vẹn (passthrough)", () => {
    const schema = buildCustomFieldsSchema([poCode])
    const result = schema.safeParse({ cf_ma_po: "PO-1", cf_ghi_chu_cu: "giá trị cũ vẫn còn" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).cf_ghi_chu_cu).toBe("giá trị cũ vẫn còn")
    }
  })

  it("SELECT chỉ nhận mã trong danh mục đã khai", () => {
    const select: CustomFieldDefinitionInput = {
      key: "cf_muc_do",
      dataType: "SELECT",
      requirement: "OPTIONAL",
      status: "ACTIVE",
      options: ["THAP", "CAO"],
    }
    const schema = buildCustomFieldsSchema([select])
    expect(schema.safeParse({ cf_muc_do: "THAP" }).success).toBe(true)
    expect(schema.safeParse({ cf_muc_do: "KHONG_TON_TAI" }).success).toBe(false)
  })
})
