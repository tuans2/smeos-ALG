import { describe, expect, it } from "vitest"
import {
  DEFAULT_FILTER_STATE,
  filterAndSortProducts,
  matchProductOccasion,
  matchProductPrice,
  removeVietnameseTones,
  type MinimalProductItem,
} from "@/components/products/product-filter-types"
import { matchPriceMode, productPriceMode } from "@/components/products/product-price-span"

describe("Bộ lọc sản phẩm Mẫu Hoa: Giá, Dịp & Tìm kiếm", () => {
  const sampleProducts: MinimalProductItem[] = [
    {
      id: "p1",
      code: "BST-Basic-CB-035",
      name: "Ke Hoa Vieng Tong Vang",
      category: "Hoa chia buồn",
      price_vnd: 2_412_000,
    },
    {
      id: "p2",
      code: "BST-Basic-CB-033",
      name: "Ke Hoa Vieng Hai Tang Hong Vang",
      category: "Hoa chia buồn",
      price_vnd: 1_740_000,
    },
    {
      id: "p3",
      code: "FL-1001",
      name: "Bó hoa Nắng Hè Rực Rỡ",
      category: "Bó hoa",
      price_vnd: 450_000,
      attributes: { occasions: "Sinh nhật, Chúc mừng" },
    },
    {
      id: "p4",
      code: "FL-1002",
      name: "Giỏ hoa Tình Yêu Ngọt Ngào",
      category: "Giỏ hoa",
      price_vnd: 680_000,
      attributes: { occasions: "Kỷ niệm, Tình yêu, Lễ tình nhân 14/2" },
    },
    {
      id: "p5",
      code: "FL-1003",
      name: "Kệ hoa Khai Trương Hồng Phát",
      category: "Kệ khai trương",
      price_vnd: 1_500_000,
    },
    {
      id: "p6",
      code: "FL-9999",
      name: "Bình hoa VIP Đặt Riêng",
      category: "Bình hoa",
      price_vnd: null, // Liên hệ báo giá
    },
  ]

  it("removeVietnameseTones: chuẩn hóa tiếng Việt bỏ dấu chính xác", () => {
    expect(removeVietnameseTones("Kệ Hoa Viếng")).toBe("ke hoa vieng")
    expect(removeVietnameseTones("Đang bán")).toBe("dang ban")
    expect(removeVietnameseTones("Tình Yêu")).toBe("tinh yeu")
  })

  it("matchProductOccasion: nhận diện Dịp Chia buồn / Viếng từ tên và danh mục", () => {
    expect(matchProductOccasion(sampleProducts[0]!, "chia_buon")).toBe(true)
    expect(matchProductOccasion(sampleProducts[1]!, "chia_buon")).toBe(true)
    expect(matchProductOccasion(sampleProducts[2]!, "chia_buon")).toBe(false)
  })

  it("matchProductOccasion: nhận diện Dịp Sinh nhật từ attributes hoặc tên", () => {
    expect(matchProductOccasion(sampleProducts[2]!, "sinh_nhat")).toBe(true)
    expect(matchProductOccasion(sampleProducts[0]!, "sinh_nhat")).toBe(false)
  })

  it("matchProductOccasion: nhận diện Dịp Khai trương từ tên hoặc category", () => {
    expect(matchProductOccasion(sampleProducts[4]!, "khai_truong")).toBe(true)
    expect(matchProductOccasion(sampleProducts[2]!, "khai_truong")).toBe(false)
  })

  it("matchProductPrice: lọc các phân khúc giá chuẩn xác", () => {
    // Dưới 500k
    expect(matchProductPrice(sampleProducts[2]!.price_vnd, "under_500k", null, null)).toBe(true)
    expect(matchProductPrice(sampleProducts[3]!.price_vnd, "under_500k", null, null)).toBe(false)

    // 500k - 1tr
    expect(matchProductPrice(sampleProducts[3]!.price_vnd, "500k_1m", null, null)).toBe(true)
    expect(matchProductPrice(sampleProducts[4]!.price_vnd, "500k_1m", null, null)).toBe(false)

    // 1tr - 2tr
    expect(matchProductPrice(sampleProducts[1]!.price_vnd, "1m_2m", null, null)).toBe(true)
    expect(matchProductPrice(sampleProducts[4]!.price_vnd, "1m_2m", null, null)).toBe(true)
    expect(matchProductPrice(sampleProducts[0]!.price_vnd, "1m_2m", null, null)).toBe(false)

    // Trên 2tr
    expect(matchProductPrice(sampleProducts[0]!.price_vnd, "over_2m", null, null)).toBe(true)
    expect(matchProductPrice(sampleProducts[1]!.price_vnd, "over_2m", null, null)).toBe(false)

    // Giá null không vào các khoảng giá cụ thể
    expect(matchProductPrice(sampleProducts[5]!.price_vnd, "under_500k", null, null)).toBe(false)
    expect(matchProductPrice(sampleProducts[5]!.price_vnd, "all", null, null)).toBe(true)
  })

  it("filterAndSortProducts: lọc kết hợp từ khoá, dịp và giá", () => {
    // Lọc Dịp Chia buồn
    const viengList = filterAndSortProducts(sampleProducts, {
      ...DEFAULT_FILTER_STATE,
      occasion: "chia_buon",
    })
    expect(viengList.map((p) => p.code)).toEqual(["BST-Basic-CB-035", "BST-Basic-CB-033"])

    // Lọc Dịp Chia buồn + Giá 1tr - 2tr
    const vieng1m2m = filterAndSortProducts(sampleProducts, {
      ...DEFAULT_FILTER_STATE,
      occasion: "chia_buon",
      priceRange: "1m_2m",
    })
    expect(vieng1m2m.map((p) => p.code)).toEqual(["BST-Basic-CB-033"])

    // Sắp xếp giá tăng dần
    const sortedAsc = filterAndSortProducts(sampleProducts, {
      ...DEFAULT_FILTER_STATE,
      sortBy: "price_asc",
    })
    expect(sortedAsc[0]!.price_vnd).toBe(450_000)
    expect(sortedAsc[1]!.price_vnd).toBe(680_000)

    // Sắp xếp giá giảm dần
    const sortedDesc = filterAndSortProducts(sampleProducts, {
      ...DEFAULT_FILTER_STATE,
      sortBy: "price_desc",
    })
    expect(sortedDesc[0]!.price_vnd).toBe(2_412_000)
  })
})

describe("lọc / sắp xếp theo khoảng giá", () => {
  const ranged = {
    id: "r", name: "Bó theo size", code: "R1", category: null, price_vnd: 400000,
    attributes: { price: 400000, pricing: { mode: "RANGE", dimensions: [{ key: "S", label: "Kích cỡ", values: ["Nhỏ", "Lớn"] }], rows: [{ values: ["Nhỏ"], price_vnd: 400000 }, { values: ["Lớn"], price_vnd: 1200000 }] } },
  }
  const contact = { id: "c", name: "Kệ", code: "C1", category: null, price_vnd: null, attributes: { pricing: { mode: "CONTACT" } } }

  it("khoảng giá giao với khoảng lọc thì khớp; Liên hệ không khớp bộ lọc giá", () => {
    expect(matchProductPrice({ min: 400000, max: 1200000 }, "1m_2m", null, null)).toBe(true)
    expect(matchProductPrice({ min: 400000, max: 1200000 }, "over_2m", null, null)).toBe(false)
    const out = filterAndSortProducts([ranged, contact], { ...DEFAULT_FILTER_STATE, priceRange: "1m_2m" })
    expect(out.map((p) => p.id)).toEqual(["r"])
  })

  it("giá cao → thấp theo giá cao nhất, Liên hệ xếp cuối", () => {
    const plain = { id: "p", name: "Bó", code: "P1", category: null, price_vnd: 900000, attributes: null }
    const out = filterAndSortProducts([plain, contact, ranged], { ...DEFAULT_FILTER_STATE, sortBy: "price_desc" })
    expect(out.map((p) => p.id)).toEqual(["r", "p", "c"])
  })
})

describe("lọc theo kiểu giá", () => {
  it("sản phẩm chưa khai kiểu giá là Giá xác định", () => {
    expect(productPriceMode({ attributes: { price: 1000 } })).toBe("FIXED")
    expect(productPriceMode({ attributes: null })).toBe("FIXED")
    expect(matchPriceMode({ attributes: { pricing: { mode: "CONTACT" } } }, "CONTACT")).toBe(true)
    expect(matchPriceMode({ attributes: { pricing: { mode: "CONTACT" } } }, "RANGE")).toBe(false)
    expect(matchPriceMode({ attributes: null }, "all")).toBe(true)
  })
})

