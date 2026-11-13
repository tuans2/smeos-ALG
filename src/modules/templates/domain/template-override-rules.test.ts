import { describe, it, expect } from "vitest"
import {
  isTemplateFamily,
  validateSetTemplateOverrideInput,
} from "./template-override-rules"

describe("template-override-rules (nợ #99 — ghi đè template theo tenant)", () => {
  describe("isTemplateFamily", () => {
    it("nhận đúng 5 họ template đóng", () => {
      expect(isTemplateFamily("GT")).toBe(true)
      expect(isTemplateFamily("IT")).toBe(true)
      expect(isTemplateFamily("CT")).toBe(true)
      expect(isTemplateFamily("ST")).toBe(true)
      expect(isTemplateFamily("OT")).toBe(true)
    })

    it("từ chối giá trị lạ hoặc chữ thường (không tự sửa)", () => {
      expect(isTemplateFamily("st")).toBe(false)
      expect(isTemplateFamily("XX")).toBe(false)
      expect(isTemplateFamily(123)).toBe(false)
      expect(isTemplateFamily(null)).toBe(false)
    })
  })

  describe("validateSetTemplateOverrideInput", () => {
    it("chấp nhận đúng field đã có nơi đọc thật (ST/sales_pitch_zalo/greeting_line)", () => {
      const result = validateSetTemplateOverrideInput({
        templateFamily: "ST",
        templateKey: "sales_pitch_zalo",
        fieldKey: "greeting_line",
        value: "  Chào mừng quý khách!  ",
      })
      expect("field" in result).toBe(false)
      if (!("field" in result)) {
        expect(result.value).toBe("Chào mừng quý khách!")
      }
    })

    it("từ chối họ template không hợp lệ", () => {
      const result = validateSetTemplateOverrideInput({
        templateFamily: "XX",
        templateKey: "sales_pitch_zalo",
        fieldKey: "greeting_line",
        value: "abc",
      })
      expect("field" in result && result.field).toBe("templateFamily")
    })

    it("từ chối field chưa được xác nhận có nơi đọc thật — KHÔNG bịa cho phép", () => {
      const result = validateSetTemplateOverrideInput({
        templateFamily: "ST",
        templateKey: "sales_pitch_zalo",
        fieldKey: "closing_line_khong_ton_tai",
        value: "abc",
      })
      expect("field" in result && result.field).toBe("fieldKey")
    })

    it("từ chối value rỗng sau khi cắt khoảng trắng", () => {
      const result = validateSetTemplateOverrideInput({
        templateFamily: "ST",
        templateKey: "sales_pitch_zalo",
        fieldKey: "greeting_line",
        value: "   ",
      })
      expect("field" in result && result.field).toBe("value")
    })

    it("từ chối value vượt quá độ dài tối đa", () => {
      const result = validateSetTemplateOverrideInput({
        templateFamily: "ST",
        templateKey: "sales_pitch_zalo",
        fieldKey: "greeting_line",
        value: "x".repeat(201),
      })
      expect("field" in result && result.field).toBe("value")
    })
  })
})
