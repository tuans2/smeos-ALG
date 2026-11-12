import { describe, expect, it } from "vitest"

import { floristNextStatus, floristNoteFrom, toFloristItem, withProductFallback } from "../florist-work"

describe("việc chế tác của thợ (checklist ALG 4.13)", () => {
  it("nhận việc từ ASSIGNED, báo xong từ ARRANGING/QUALITY_CHECK; sai bước → null", () => {
    expect(floristNextStatus("ASSIGNED", "START")).toBe("ARRANGING")
    expect(floristNextStatus("ARRANGING", "FINISH")).toBe("READY")
    expect(floristNextStatus("QUALITY_CHECK", "FINISH")).toBe("READY")
    expect(floristNextStatus("ASSIGNED", "FINISH")).toBeNull()
    expect(floristNextStatus("READY", "START")).toBeNull()
  })

  it("đọc phiên bản khách chọn và số cành của phiên bản (checklist ALG 2.4)", () => {
    const item = toFloristItem({ description: "Bó hồng — Lớn", quantity: 1, metadata: { variant: { id: "opt:1", name: "Lớn", stemCount: 50 } } })
    expect(item).toMatchObject({ variantName: "Lớn", stemCount: 50 })
  })

  it("chỉ giữ công thức và ảnh mẫu, bỏ mọi trường khác trong metadata", () => {
    const item = toFloristItem({
      description: "Bó hồng", quantity: 1,
      metadata: { flowers: [{ flowerName: "Hồng", quantity: 12, unit: "cành", color: "đỏ", role: "Chủ đạo", costVnd: 9000 }, { quantity: 3 }], sampleImageUrl: "https://x/y.png", costVnd: 1 },
    })
    expect(item).toEqual({
      description: "Bó hồng", quantity: 1, sampleImageUrl: "https://x/y.png", variantName: null, stemCount: null,
      recipe: [{ flowerName: "Hồng", quantity: 12, unit: "cành", color: "đỏ", role: "Chủ đạo" }],
    })
  })

  it("ảnh chụp mẫu của đơn Thẻ Chào (imageUrl) là ảnh mẫu; sản phẩm bổ sung ảnh mới và công thức khi dòng hàng thiếu (4.9)", () => {
    const item = toFloristItem({ description: "Bó hồng", quantity: 1, metadata: { imageUrl: "/api/v1/storage/k?exp=1", flowersSummary: "Hồng" } })
    expect(item.sampleImageUrl).toBe("/api/v1/storage/k?exp=1")
    const recipe = [{ flowerName: "Hồng", quantity: 10, unit: "cành", color: null, role: "Chủ đạo" }]
    expect(withProductFallback(item, { imageUrl: "/api/v1/storage/k?exp=2", recipe })).toMatchObject({ sampleImageUrl: "/api/v1/storage/k?exp=2", recipe })
    const own = { ...item, recipe: [{ ...recipe[0]!, flowerName: "Cúc" }] }
    expect(withProductFallback(own, { imageUrl: null, recipe }).recipe[0]!.flowerName).toBe("Cúc")
    expect(withProductFallback(own, { imageUrl: null, recipe }).sampleImageUrl).toBe("/api/v1/storage/k?exp=1")
    expect(withProductFallback(item, undefined)).toBe(item)
  })

  it("ghi chú xưởng bỏ dòng về tiền, nhãn chờ báo giá và phí giao lại; giữ lời dặn của khách (4.9)", () => {
    const note = [
      "[Thẻ chào ABC123] [Chờ báo giá] Gói giấy hồng",
      "[Điều hành: chưa nhận được tiền] Chưa thấy tiền về tài khoản",
      "[Báo giá] 650.000 đ — khách đồng ý",
      "[Giao không thành công] Không liên lạc được · phí giao lại 30.000đ",
      "[Florist] Thêm nơ đỏ",
    ].join("\n")
    expect(floristNoteFrom(note)).toBe("[Thẻ chào ABC123] Gói giấy hồng\n[Giao không thành công] Không liên lạc được\n[Florist] Thêm nơ đỏ")
    expect(floristNoteFrom(null)).toBe("")
  })
})
