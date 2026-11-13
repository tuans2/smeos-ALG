import { describe, it, expect } from "vitest"
import { activationWarnings, computeProductReadiness, type ProductReadinessInput } from "../product-readiness"

describe("computeProductReadiness (T6.1 / Role UX Product Manager)", () => {
  const completeProduct: ProductReadinessInput = {
    id: "prod-1",
    code: "SP-001",
    name: "Bó Hồng Đỏ Ecuador",
    status: "ACTIVE",
    category: "Sản phẩm",
    masterImageUrl: "https://example.com/hoa-hong.jpg",
    pricing: {
      quotePriceVnd: 550_000,
      costPriceVnd: 300_000,
    },
    bom: {
      flowers: [{ flowerName: "Hồng Ecuador", quantity: 10 }],
    },
    hasApprovedCopy: true,
  }

  it("sản phẩm hoàn thiện đủ 5 tiêu chí đạt điểm tối đa 100% và isReady = true", () => {
    const res = computeProductReadiness(completeProduct)
    expect(res.isReady).toBe(true)
    expect(res.score).toBe(100)
    expect(res.missingReasons).toHaveLength(0)
    expect(res.criteria.hasActiveStatus).toBe(true)
    expect(res.criteria.hasMasterImage).toBe(true)
    expect(res.criteria.hasCategory).toBe(true)
    expect(res.criteria.hasPricingOrBom).toBe(true)
  })

  it("phát hiện sản phẩm chưa kích hoạt (status DRAFT)", () => {
    const res = computeProductReadiness({ ...completeProduct, status: "DRAFT" })
    expect(res.isReady).toBe(false)
    expect(res.score).toBe(80)
    expect(res.missingReasons).toContain("Sản phẩm chưa kích hoạt (đang ở trạng thái Nháp hoặc Lưu trữ)")
  })

  it("phát hiện sản phẩm thiếu ảnh đại diện chính thức", () => {
    const res = computeProductReadiness({ ...completeProduct, masterImageUrl: undefined })
    expect(res.isReady).toBe(false)
    expect(res.score).toBe(80)
    expect(res.missingReasons).toContain("Thiếu ảnh sản phẩm chính thức")
  })

  it("phát hiện sản phẩm thiếu danh mục", () => {
    const res = computeProductReadiness({ ...completeProduct, category: null })
    expect(res.isReady).toBe(false)
    expect(res.score).toBe(80)
    expect(res.missingReasons).toContain("Chưa phân loại danh mục (Sản phẩm, Giỏ hoa, Kệ khai trương...)")
  })

  it("chấp nhận sản phẩm có BOM dù chưa có giá niêm yết cố định (hệ thống dynamic pricing)", () => {
    const res = computeProductReadiness({
      ...completeProduct,
      pricing: { quotePriceVnd: null, costPriceVnd: null },
      bom: { flowers: [{ flowerName: "Hồng kem", quantity: 5 }] },
    })
    expect(res.isReady).toBe(true)
    expect(res.score).toBe(100)
    expect(res.criteria.hasPricingOrBom).toBe(true)
  })

  it("phát hiện sản phẩm hoàn toàn thiếu cả giá lẫn BOM cành hoa", () => {
    const res = computeProductReadiness({
      ...completeProduct,
      pricing: { quotePriceVnd: null, costPriceVnd: null },
      bom: { flowers: [] },
    })
    expect(res.isReady).toBe(false)
    expect(res.score).toBe(80)
    expect(res.missingReasons).toContain("Chưa có giá niêm yết hoặc công thức thành phần (BOM)")
  })

  it("tính đúng số điểm khi thiếu nhiều tiêu chí cùng lúc", () => {
    const res = computeProductReadiness({
      id: "prod-empty",
      code: "SP-EMPTY",
      name: "Sản phẩm rỗng",
      status: "DRAFT",
    })
    expect(res.isReady).toBe(false)
    expect(res.score).toBe(0)
    expect(res.missingReasons).toHaveLength(5)
  })

  it("thiếu bài viết đã duyệt → chưa sẵn sàng; cảnh báo mở bán bỏ tiêu chí trạng thái (checklist ALG 7.3)", () => {
    const res = computeProductReadiness({ ...completeProduct, hasApprovedCopy: false })
    expect(res.isReady).toBe(false)
    expect(res.score).toBe(80)
    expect(res.missingReasons).toEqual(["Chưa có bài viết bán hàng được duyệt"])
    expect(activationWarnings({ ...completeProduct, status: "DRAFT", hasApprovedCopy: false })).toEqual(["Chưa có bài viết bán hàng được duyệt"])
  })
})
