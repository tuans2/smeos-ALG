import { describe, expect, it } from "vitest"

import { FACET_DEFS, buildFacetGroups, facetValues, matchesFacets } from "../partner-marketplace-facets"
import { rowToProfile } from "../partner-marketplace-row-mapper"
import type { PartnerStoreMarketplaceEntity } from "../partner-marketplace.types"

function store(id: string, cols: Record<number, string>): PartnerStoreMarketplaceEntity {
  const r = Array.from({ length: 75 }, () => "")
  r[5] = id
  for (const [i, v] of Object.entries(cols)) r[Number(i)] = v
  return { ...rowToProfile(r)!, id }
}
const def = (key: string) => FACET_DEFS.find((d) => d.key === key)!

// 15 địa chỉ · 34 khó khăn · 53 kho lạnh · 66 điểm tay nghề · 73 hạng · 33 thanh toán
const A = store("A", { 15: "49 nguyễn phong sắc", 34: "Marketing, Thiếu khách", 53: "không có", 66: "4", 73: "Hạng Đạt Chứng nhận", 33: "qr, tiền mặt" })
const B = store("B", { 15: "38 Vũ Trọng Khánh HĐ", 34: "Nhân sự", 53: "có 1 kho", 73: "Hạng Tăng trưởng" })
const C = store("C", { 15: "307 Giảng Võ, Ô Chợ Dừa, HN", 34: "marketing", 53: "chưa xác định", 73: "Hạng Tiêu Chuẩn" })

describe("facetValues", () => {
  it("quận: nhận tên đường, viết tắt có chữ đ, đường thuộc hai quận; không nhận được → Khác", () => {
    expect(facetValues(A, def("contact.address"))).toEqual(["Cầu Giấy"])
    expect(facetValues(B, def("contact.address"))).toEqual(["Hà Đông"])
    expect(facetValues(C, def("contact.address"))).toEqual(["Ba Đình", "Đống Đa"])
    expect(facetValues(store("D", { 15: "12 phố lạ" }), def("contact.address"))).toEqual(["Khác / chưa rõ"])
  })

  it("câu nhiều lựa chọn tách theo dấu phẩy, gộp hoa/thường, viết hoa từ viết tắt", () => {
    expect(facetValues(A, def("business.challenges"))).toEqual(["Marketing", "Thiếu khách"])
    expect(facetValues(C, def("business.challenges"))).toEqual(["Marketing"])
    expect(facetValues(A, def("business.paymentMethods"))).toEqual(["QR", "Tiền mặt"])
  })

  it("có/không gom từ câu trả lời tự do; điểm thành “n điểm”; hạng đã gộp", () => {
    expect(facetValues(A, def("facilityAndDelivery.coldStorage"))).toEqual(["Không"])
    expect(facetValues(B, def("facilityAndDelivery.coldStorage"))).toEqual(["Có"])
    expect(facetValues(C, def("facilityAndDelivery.coldStorage"))).toEqual(["Chưa rõ"])
    expect(facetValues(A, def("scoreAndTier.skillAndCraftScore"))).toEqual(["4 điểm"])
    expect(facetValues(B, def("scoreAndTier.suggestedTier"))).toEqual(["Hạng Tiêu Chuẩn"])
  })
})

describe("matchesFacets / buildFacetGroups", () => {
  const all = [A, B, C]

  it("trong một nhóm HOẶC, giữa các nhóm VÀ", () => {
    const pick = (sel: Record<string, string[]>) => all.filter((s) => matchesFacets(s, sel)).map((s) => s.id)
    expect(pick({ "contact.address": ["Cầu Giấy", "Hà Đông"] })).toEqual(["A", "B"])
    expect(pick({ "contact.address": ["Cầu Giấy", "Hà Đông"], "business.challenges": ["Marketing"] })).toEqual(["A"])
    expect(pick({})).toEqual(["A", "B", "C"])
  })

  it("số đếm mỗi nhóm tính theo các nhóm KHÁC đang chọn; tiêu chí đang chọn luôn còn trong danh sách", () => {
    const groups = buildFacetGroups(all, { "business.challenges": ["Nhân sự"] })
    const tier = groups.find((g) => g.key === "scoreAndTier.suggestedTier")!
    // Lựa chọn cố định theo toàn bộ dữ liệu, số đếm theo nhóm khác đang chọn
    expect(tier.options).toEqual([
      { value: "Hạng Tiêu Chuẩn", count: 1 },
      { value: "Hạng Đạt Chứng nhận", count: 0 },
    ])
    const challenges = groups.find((g) => g.key === "business.challenges")!
    expect(challenges.options.find((o) => o.value === "Marketing")?.count).toBe(2)
  })
})

describe("FACET_DEFS", () => {
  it("nhãn số thợ trung tính theo ngành, không viết cứng thuật ngữ ngành Hoa (ratchet IT-F05/F06/F11)", () => {
    expect(def("production.floristCount").label).toBe("Số lượng nhân sự chế tác")
    expect(FACET_DEFS.some((d) => /cắm hoa|thợ hoa/i.test(d.label))).toBe(false)
  })
})
