import { describe, it, expect } from "vitest"
import {
  checkFlowerContent,
  sanitizeFlowerContent,
  assertFlowerContentAllowed,
  getDefaultFlowerRules,
  parseBrandForbiddenStyles,
} from "./flower-content-guard"
import { AppError } from "@/core/http/errors"

describe("FlowerContentGuard", () => {
  it("load được danh mục quy tắc mặc định từ JSON", () => {
    const rules = getDefaultFlowerRules()
    expect(rules.length).toBeGreaterThan(10)
    expect(rules.some((r) => r.phrase === "hoa vĩnh cửu")).toBe(true)
    expect(rules.some((r) => r.phrase === "tóm lại")).toBe(true)
  })

  it("trả về valid khi văn bản sạch sẽ, không chứa từ cấm", () => {
    const cleanText = "Bó hoa hồng đỏ Ecuador phối cùng baby trắng tinh khôi, món quà ý nghĩa ngày sinh nhật."
    const result = checkFlowerContent(cleanText)
    expect(result.isValid).toBe(true)
    expect(result.hasWarnings).toBe(false)
    expect(result.hardBlocks).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it("phát hiện HARD_BLOCK khi có cam kết sai lệch (ví dụ 'hoa vĩnh cửu')", () => {
    const badText = "Shop bán bó hoa vĩnh cửu không bao giờ tàn giá siêu hời."
    const result = checkFlowerContent(badText)
    expect(result.isValid).toBe(false)
    expect(result.hardBlocks.length).toBeGreaterThanOrEqual(2)
    expect(result.hardBlocks.some((b) => b.phrase === "hoa vĩnh cửu")).toBe(true)
    expect(result.hardBlocks.some((b) => b.phrase === "không bao giờ tàn")).toBe(true)
  })

  it("phát hiện WARNING với từ sáo rỗng AI ('chúng tôi vô cùng hào hứng')", () => {
    const warningText = "Chúng tôi vô cùng hào hứng giới thiệu mẫu hoa mới."
    const result = checkFlowerContent(warningText)
    expect(result.isValid).toBe(true) // Vẫn valid vì không có hard block
    expect(result.hasWarnings).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.phrase).toBe("chúng tôi vô cùng hào hứng")
  })


  it("tích hợp brand forbidden styles từ BrandProfile", () => {
    const text = "Mẫu hoa sáp cao cấp dành cho bạn gái."
    // Bình thường không cấm "hoa sáp", nhưng brand cấm
    const resultNormal = checkFlowerContent(text)
    expect(resultNormal.isValid).toBe(true)

    const resultWithBrand = checkFlowerContent(text, {
      brandForbiddenStyles: "hoa sáp, hoa lụa, xốp cắm",
    })
    expect(resultWithBrand.isValid).toBe(false)
    expect(resultWithBrand.hardBlocks.some((b) => b.phrase === "hoa sáp")).toBe(true)
  })

  it("parseBrandForbiddenStyles xử lý đúng các ký tự phân cách", () => {
    const rules = parseBrandForbiddenStyles("hoa sáp; hoa lụa\nkim tuyến, neon")
    expect(rules).toHaveLength(4)
    expect(rules.map((r) => r.phrase)).toEqual(["hoa sáp", "hoa lụa", "kim tuyến", "neon"])
  })

  it("sanitizeFlowerContent tự động thay thế cụm từ vi phạm bằng từ gợi ý", () => {
    const text = "Cam kết hoa vĩnh cửu và xả kho lỗ vốn hôm nay."
    const sanitized = sanitizeFlowerContent(text)
    expect(sanitized.sanitizedText).toContain("hoa giữ độ tươi bền lâu")
    expect(sanitized.sanitizedText).toContain("Ưu đãi tri ân đặc biệt trong ngày")
    expect(sanitized.sanitizedText).not.toContain("hoa vĩnh cửu")
    expect(sanitized.sanitizedText).not.toContain("xả kho lỗ vốn")
    expect(sanitized.replacementsApplied).toHaveLength(2)
  })

  it("assertFlowerContentAllowed ném AppError('VALIDATION_FAILED') khi vi phạm", () => {
    const text = "Sản phẩm rẻ như cho, mua ngay!"
    expect(() => assertFlowerContentAllowed(text, "Tiêu đề bài viết")).toThrow(AppError)
    try {
      assertFlowerContentAllowed(text, "Tiêu đề bài viết")
    } catch (err: unknown) {
      const appErr = err as AppError
      expect(appErr.code).toBe("VALIDATION_FAILED")
      expect(appErr.message).toContain("Tiêu đề bài viết chứa từ ngữ cấm ngành hoa")
    }
  })
})
