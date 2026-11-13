import { describe, it, expect } from "vitest"
import { StructuredAddressSchema } from "@/modules/coordinator/contracts/common"
import { formatStructuredAddress } from "@/modules/products/domain/product-master-index"

describe("Atomic Structured Address (5-Tier SSOT)", () => {
  it("validates 5-tier structured address with Zod schema", () => {
    const validAddress = {
      street: "195 Lương Thế Vinh",
      ward: "Phường Trung Văn",
      district: "Quận Nam Từ Liêm",
      city: "Hà Nội",
      country: "Việt Nam",
    }
    const result = StructuredAddressSchema.safeParse(validAddress)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.street).toBe("195 Lương Thế Vinh")
      expect(result.data.ward).toBe("Phường Trung Văn")
      expect(result.data.district).toBe("Quận Nam Từ Liêm")
      expect(result.data.city).toBe("Hà Nội")
      expect(result.data.country).toBe("Việt Nam")
    }
  })

  it("applies default country 'Việt Nam' when omitted", () => {
    const withoutCountry = {
      street: "Số 18, Ngõ 95, Chùa Bộc",
      ward: "Phường Trung Liệt",
      district: "Quận Đống Đa",
      city: "Hà Nội",
    }
    const result = StructuredAddressSchema.safeParse(withoutCountry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.country).toBe("Việt Nam")
    }
  })

  it("fails validation when street, ward, district, or city is missing", () => {
    const invalidAddress = {
      street: "195 Lương Thế Vinh",
      // missing ward, district, city
    }
    const result = StructuredAddressSchema.safeParse(invalidAddress)
    expect(result.success).toBe(false)
  })

  it("formats structured address correctly into a unified standard string", () => {
    const addr = {
      street: "Tầng 3 Khách sạn Daewoo, 360 Kim Mã",
      ward: "Phường Ngọc Khánh",
      district: "Quận Ba Đình",
      city: "Hà Nội",
      country: "Việt Nam",
    }
    const formatted = formatStructuredAddress(addr)
    expect(formatted).toBe(
      "Tầng 3 Khách sạn Daewoo, 360 Kim Mã, Phường Ngọc Khánh, Quận Ba Đình, Hà Nội, Việt Nam"
    )
  })

  it("handles string address fallback gracefully", () => {
    const rawString = "Phòng 802 Lotte Center, Ba Đình, Hà Nội"
    expect(formatStructuredAddress(rawString)).toBe(rawString)
    expect(formatStructuredAddress(undefined)).toBe("")
    expect(formatStructuredAddress(null)).toBe("")
  })
})
