import { describe, it, expect } from "vitest"
import {
  isOccasionRegister,
  normalizeOccasionCode,
  normalizeOccasionName,
  validateCreateOccasionInput,
  validateUpdateOccasionInput,
} from "./occasion-rules"

describe("occasion-rules (nợ #104 — giọng theo dịp)", () => {
  describe("isOccasionRegister", () => {
    it("nhận đúng ba giá trị đóng", () => {
      expect(isOccasionRegister("FESTIVE")).toBe(true)
      expect(isOccasionRegister("NEUTRAL")).toBe(true)
      expect(isOccasionRegister("SOLEMN")).toBe(true)
    })

    it("từ chối giá trị lạ hoặc chữ thường (không tự sửa)", () => {
      expect(isOccasionRegister("festive")).toBe(false)
      expect(isOccasionRegister("HAPPY")).toBe(false)
      expect(isOccasionRegister(123)).toBe(false)
      expect(isOccasionRegister(null)).toBe(false)
    })
  })

  describe("normalizeOccasionCode / normalizeOccasionName", () => {
    it("cắt khoảng trắng và đổi mã thành chữ thường có gạch dưới", () => {
      expect(normalizeOccasionCode("  Chia Buồn  ")).toBe("chia_buồn")
      expect(normalizeOccasionCode("women day")).toBe("women_day")
    })

    it("trả null khi chuỗi rỗng sau khi cắt", () => {
      expect(normalizeOccasionCode("   ")).toBeNull()
      expect(normalizeOccasionName("   ")).toBeNull()
    })
  })

  describe("validateCreateOccasionInput", () => {
    it("chấp nhận đầu vào hợp lệ, mặc định register = FESTIVE khi không truyền", () => {
      const result = validateCreateOccasionInput({ code: "tot_nghiep", name: "Tốt nghiệp" })
      expect(result).toEqual({ code: "tot_nghiep", name: "Tốt nghiệp", register: "FESTIVE", sortOrder: 0 })
    })

    it("giữ nguyên register do người dùng chọn", () => {
      const result = validateCreateOccasionInput({ code: "condolence", name: "Chia buồn", register: "SOLEMN", sortOrder: 7 })
      expect(result).toEqual({ code: "condolence", name: "Chia buồn", register: "SOLEMN", sortOrder: 7 })
    })

    it("báo lỗi khi code hoặc name rỗng", () => {
      expect(validateCreateOccasionInput({ code: "  ", name: "Tốt nghiệp" })).toEqual({
        field: "code",
        message: "Mã dịp không được để trống",
      })
      expect(validateCreateOccasionInput({ code: "tot_nghiep", name: "  " })).toEqual({
        field: "name",
        message: "Tên dịp không được để trống",
      })
    })

    it("báo lỗi khi register không phải một trong ba giá trị đóng", () => {
      const result = validateCreateOccasionInput({
        code: "tot_nghiep",
        name: "Tốt nghiệp",
        // @ts-expect-error — cố tình truyền giá trị sai để kiểm tra chặn ở runtime
        register: "HAPPY",
      })
      expect(result).toEqual({ field: "register", message: "Tông giọng không hợp lệ" })
    })
  })

  describe("validateUpdateOccasionInput", () => {
    it("chỉ trả về các trường thật sự có mặt, không tự điền mặc định", () => {
      expect(validateUpdateOccasionInput({ isActive: false })).toEqual({ is_active: false })
      expect(validateUpdateOccasionInput({ register: "SOLEMN" })).toEqual({ register: "SOLEMN" })
    })

    it("không nhận trường code trong kiểu đầu vào (chặn ở kiểu, không phải ở hàm)", () => {
      // occasion-rules.ts cố tình không khai `code` trong UpdateOccasionInput —
      // xem chú thích trong validateUpdateOccasionInput vì sao không cho đổi mã.
      const result = validateUpdateOccasionInput({ name: "Tốt nghiệp (đổi tên)" })
      expect(result).toEqual({ name: "Tốt nghiệp (đổi tên)" })
    })

    it("báo lỗi khi name rỗng hoặc register không hợp lệ", () => {
      expect(validateUpdateOccasionInput({ name: "   " })).toEqual({
        field: "name",
        message: "Tên dịp không được để trống",
      })
      expect(
        // @ts-expect-error — cố tình truyền giá trị sai để kiểm tra chặn ở runtime
        validateUpdateOccasionInput({ register: "HAPPY" })
      ).toEqual({ field: "register", message: "Tông giọng không hợp lệ" })
    })

    it("trả object rỗng khi không có trường nào được truyền", () => {
      expect(validateUpdateOccasionInput({})).toEqual({})
    })
  })
})
