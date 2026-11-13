import { describe, it, expect } from "vitest"
import { validateProductTruth } from "../product-truth-validator"

describe("Product Truth Validator (TR-POL-001 Ported from LocalBudd)", () => {
  it("should pass when price and names are consistent", () => {
    const products = [
      { name: "Bó Hoa Hồng Ohara", price: 650000 },
    ]
    const content = {
      headline: "Tuyệt phẩm Bó Hoa Hồng Ohara thanh khiết",
      subHeadline: "Giá ưu đãi 650.000 đ cho ngày hôm nay",
      paragraphs: ["Thiết kế cao cấp giao nhanh 2h"],
    }

    const result = validateProductTruth(products, content)
    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it("should detect hallucinated price when numbers deviate severely", () => {
    const products = [
      { name: "Bó Hoa Hồng Ohara", price: 650000 },
    ]
    const content = {
      headline: "Bó Hoa Hồng Ohara",
      subHeadline: "Chỉ với 1.800.000 đ nhận ngay bó hoa", // Sai lệch > 50%
      paragraphs: [],
    }

    const result = validateProductTruth(products, content)
    expect(result.isValid).toBe(false)
    expect(result.issues[0]?.field).toBe("price")
  })
})
