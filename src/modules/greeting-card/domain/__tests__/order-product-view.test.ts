import { describe, expect, it } from "vitest"
import { orderProductId, orderProductView } from "../order-product-view"

const images = new Map([["p1", "/kho/p1.jpg"], ["p2", "/kho/p2.jpg"]])

describe("SSOT thông tin mẫu hoa của đơn Thẻ chào", () => {
  it("sản phẩm: dòng đơn trước, mẫu khách chọn trên link sau", () => {
    expect(orderProductId({ items: [{ product_id: "p1" }], greeting_sessions: [{ selected_product_id: "p2" }] })).toBe("p1")
    expect(orderProductId({ items: [], greeting_sessions: [{ selected_product_id: "p2" }] })).toBe("p2")
    expect(orderProductId({ items: [], greeting_sessions: [] })).toBeNull()
  })

  it("ưu tiên ảnh chụp mẫu lúc khách chọn, rồi metadata dòng đơn", () => {
    const v = orderProductView(
      { items: [{ product_id: "p1", metadata: { imageUrl: "/meta.jpg" } }], greeting_sessions: [{ product_snapshot: { name: "Rosa", imageUrl: "/snap.jpg", price: 468000 } }] },
      images
    )
    expect(v).toMatchObject({ productId: "p1", name: "Rosa", imageUrl: "/snap.jpg", price: 468000 })
    expect(orderProductView({ items: [{ product_id: "p1", metadata: { imageUrl: "/meta.jpg" } }], greeting_sessions: [] }, images).imageUrl).toBe("/meta.jpg")
  })

  it("ảnh chụp mẫu thiếu ảnh → lấy ảnh hiện tại trong kho (đơn tạo tay, link chưa có đơn)", () => {
    expect(orderProductView({ items: [{ product_id: "p1", metadata: { name: "Rosa 743" } }], greeting_sessions: [{ product_snapshot: { name: "Rosa 743" } }] }, images).imageUrl).toBe("/kho/p1.jpg")
    expect(orderProductView({ items: [], greeting_sessions: [{ selected_product_id: "p2", product_snapshot: { name: "Lily" } }] }, images).imageUrl).toBe("/kho/p2.jpg")
    expect(orderProductView({ items: [{ product_id: "px" }], greeting_sessions: [] }, images).imageUrl).toBeNull()
  })

  it("link ảnh ký đã hết hạn trong ảnh chụp mẫu → dùng ảnh hiện tại trong kho", () => {
    const now = new Date("2026-10-15T00:00:00Z")
    const expired = `/api/v1/storage/org/a/p.jpg?exp=${now.getTime() - 1}&sig=x`
    const live = `/api/v1/storage/org/a/p.jpg?exp=${now.getTime() + 60_000}&sig=x`
    const src = (url: string) => ({ items: [{ product_id: "p1" }], greeting_sessions: [{ product_snapshot: { name: "Rosa", imageUrl: url } }] })
    expect(orderProductView(src(expired), images, undefined, now).imageUrl).toBe("/kho/p1.jpg")
    expect(orderProductView(src(live), images, undefined, now).imageUrl).toBe(live)
    expect(orderProductView(src("https://cdn.example/p.jpg"), images, undefined, now).imageUrl).toBe("https://cdn.example/p.jpg")
  })

  it("mẫu chỉ có link Google Drive (nhập từ Excel) → ảnh xem trước qua proxy", () => {
    const folder = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWx"
    expect(orderProductView({ items: [{ product_id: "px" }], greeting_sessions: [{ product_snapshot: { name: "Kệ", driveLink: folder } }] }, images).imageUrl)
      .toBe("/api/v1/public/drive-thumb-proxy?folder_id=1AbCdEfGhIjKlMnOpQrStUvWx")
    // Ảnh trong kho vẫn được ưu tiên hơn link Drive
    expect(orderProductView({ items: [{ product_id: "p1" }], greeting_sessions: [{ product_snapshot: { name: "Rosa", driveLink: folder } }] }, images).imageUrl).toBe("/kho/p1.jpg")
    // Link không phải Drive (trang web bán hàng) → không có ảnh
    expect(orderProductView({ items: [{ product_id: "px", metadata: { driveLink: "https://shop.example/hoa.html" } }], greeting_sessions: [] }, images).imageUrl).toBeNull()
  })

  it("tên và giá rơi về mô tả / đơn giá dòng đơn, rồi tên mặc định", () => {
    expect(orderProductView({ items: [{ description: "Bó tay", unit_price_vnd: 300000 }], greeting_sessions: [] }, images)).toMatchObject({ name: "Bó tay", price: 300000 })
    expect(orderProductView({ items: [], greeting_sessions: [] }, images, "Chưa chốt mẫu")).toMatchObject({ name: "Chưa chốt mẫu", price: 0, imageUrl: null })
  })

  it("phiếu thợ ghi số cành theo phiên bản khách chọn (checklist ALG 2.4)", () => {
    const v = orderProductView(
      { items: [{ product_id: "p1", metadata: { flowersSummary: "Hồng đỏ", variant: { id: "opt:1", name: "Lớn", stemCount: 50 } } }], greeting_sessions: [] },
      new Map()
    )
    expect(v).toMatchObject({ variantName: "Lớn", stemCount: 50, flowersSummary: "Phiên bản Lớn: 50 cành · Hồng đỏ" })
  })
})
