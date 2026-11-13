import { describe, expect, it } from "vitest"

import {
  extractBrandCtaPhrase,
  extractBrandHashtags,
  isValidHexColor,
  validateBrandProfileInput,
  validateBusinessProfileInput,
} from "./profile-rules"

describe("hồ sơ kinh doanh", () => {
  it("bắt buộc display_name", () => {
    expect(validateBusinessProfileInput({ display_name: "" })).toEqual({
      display_name: "Tên hiển thị không được để trống",
    })
    expect(validateBusinessProfileInput({ display_name: "   " })).toEqual({
      display_name: "Tên hiển thị không được để trống",
    })
  })

  it("chấp nhận display_name hợp lệ, không kèm lỗi khác khi email vắng mặt", () => {
    expect(validateBusinessProfileInput({ display_name: "Tiệm hoa Mộc Lan" })).toEqual({})
  })

  it("kiểm định dạng email khi có", () => {
    expect(
      validateBusinessProfileInput({ display_name: "Tiệm hoa", email: "khong-phai-email" })
    ).toEqual({ email: "Địa chỉ thư không hợp lệ" })
    expect(
      validateBusinessProfileInput({ display_name: "Tiệm hoa", email: "lien-he@tiemhoa.vn" })
    ).toEqual({})
  })
})

describe("mã màu thương hiệu", () => {
  it("nhận #RGB và #RRGGBB", () => {
    expect(isValidHexColor("#fff")).toBe(true)
    expect(isValidHexColor("#FFAA00")).toBe(true)
  })

  it("từ chối mã màu sai hình dạng", () => {
    expect(isValidHexColor("fff")).toBe(false)
    expect(isValidHexColor("#ggg")).toBe(false)
    expect(isValidHexColor("#12345")).toBe(false)
    expect(isValidHexColor("red")).toBe(false)
  })
})

describe("hồ sơ thương hiệu", () => {
  it("bỏ qua trường màu vắng mặt hoặc rỗng", () => {
    expect(validateBrandProfileInput({})).toEqual({})
    expect(validateBrandProfileInput({ primary_color: null })).toEqual({})
    expect(validateBrandProfileInput({ primary_color: "" })).toEqual({})
  })

  it("báo lỗi đúng tên trường khi mã màu sai hình dạng", () => {
    expect(
      validateBrandProfileInput({ primary_color: "xanh-la", accent_color: "#0a74da" })
    ).toEqual({ primary_color: "Mã màu phải dạng #RGB hoặc #RRGGBB" })
  })

  it("mọi trường màu hợp lệ thì không có lỗi", () => {
    expect(
      validateBrandProfileInput({
        primary_color: "#0A74DA",
        secondary_color: "#F5A623",
        accent_color: "#10B981",
        background_color: "#FFFFFF",
        text_color: "#1A1A2E",
      })
    ).toEqual({})
  })
})

// Nợ #103: hai hàm đọc an toàn cho `hashtags`/`cta_templates` — trước bản
// sửa, `generate-product-copy.ts` ép kiểu thẳng rồi gọi `.join()`, vỡ với
// đúng hình dạng dữ liệu thật (`{ default: ... }`) mà `brand-profile-form.tsx`
// đang lưu cho mọi tổ chức đã cấu hình hồ sơ thương hiệu.
describe("extractBrandHashtags", () => {
  it("đọc mảng chuỗi phẳng", () => {
    expect(extractBrandHashtags(["hoa-tuoi", "giao-nhanh"])).toEqual(["hoa-tuoi", "giao-nhanh"])
  })

  it("đọc hình dạng thật { default: string[] } do giao diện lưu", () => {
    expect(extractBrandHashtags({ default: ["hoa-tuoi", "giao-nhanh"] })).toEqual([
      "hoa-tuoi",
      "giao-nhanh",
    ])
  })

  it("trả null cho null, undefined, mảng rỗng, hoặc hình dạng lạ", () => {
    expect(extractBrandHashtags(null)).toBeNull()
    expect(extractBrandHashtags(undefined)).toBeNull()
    expect(extractBrandHashtags([])).toBeNull()
    expect(extractBrandHashtags({ default: [] })).toBeNull()
    expect(extractBrandHashtags({ free_gifts: ["x"] })).toBeNull()
    expect(extractBrandHashtags("hoa-tuoi")).toBeNull()
  })
})

describe("extractBrandCtaPhrase", () => {
  it("đọc chuỗi trơn", () => {
    expect(extractBrandCtaPhrase("Đặt ngay hôm nay!")).toBe("Đặt ngay hôm nay!")
  })

  it("đọc hình dạng thật { default: string } do giao diện lưu", () => {
    expect(extractBrandCtaPhrase({ default: "Đặt ngay hôm nay!" })).toBe("Đặt ngay hôm nay!")
  })

  it("trả null cho null, chuỗi rỗng, hoặc hình dạng cũ trước 17/09", () => {
    expect(extractBrandCtaPhrase(null)).toBeNull()
    expect(extractBrandCtaPhrase(undefined)).toBeNull()
    expect(extractBrandCtaPhrase("   ")).toBeNull()
    expect(extractBrandCtaPhrase({ default: "" })).toBeNull()
    // Hình dạng CŨ (trước nợ #102): free_gifts/guarantees lồng trong
    // cta_templates — không phải một câu CTA, không đoán thay.
    expect(extractBrandCtaPhrase({ free_gifts: ["Thiệp chúc mừng"], guarantees: [] })).toBeNull()
    expect(extractBrandCtaPhrase(["Đặt ngay", "Mua liền tay"])).toBeNull()
  })
})
