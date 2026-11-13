import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { safeEmail, safeWebUrl, shopSocialLinks, shopWebsites, toShopContact, websiteLabel } from "@/modules/greeting-card/domain/shop-contact"
import { ShopInfoContent } from "@/components/greeting-card/customer/shop-info-sheet"
import { OrderReview } from "@/components/greeting-card/customer/order-review"

/** Khung "Thông tin cửa hàng" ở thanh trên cùng của link gửi khách (PO 08/10/2026). */

const shop = toShopContact({
  name: "Hoa Thảo Mộc", phone: "0901 234 567", address: "12 Lê Lợi, Q1", logoUrl: null,
  email: " lienhe@thaomoc.vn ", website: "thaomoc.vn",
  socialLinks: { facebook: "https://facebook.com/thaomoc", instagram: "javascript:alert(1)", websites: ["https://shop.thaomoc.vn", "https://thaomoc.vn/"] },
  commitments: [{ id: "c1", title: "Đúng mẫu", customerText: "Làm đúng mẫu đã chọn", internalText: "Ghi chú nội bộ bí mật" } as never],
})

describe("thông tin cửa hàng — dữ liệu", () => {
  it("chỉ nhận link http(s), thêm https:// khi thiếu, bỏ trùng; email hợp lệ", () => {
    expect(safeWebUrl("thaomoc.vn")).toBe("https://thaomoc.vn/")
    expect(safeWebUrl("javascript:alert(1)")).toBeNull()
    expect(safeWebUrl("mailto:a@b.vn")).toBeNull()
    expect(safeWebUrl("//evil")).toBeNull()
    expect(shopWebsites("thaomoc.vn", { websites: ["https://thaomoc.vn/", "shop.thaomoc.vn", 3] })).toEqual(["https://thaomoc.vn/", "https://shop.thaomoc.vn/"])
    expect(shopSocialLinks({ facebook: "https://facebook.com/x", instagram: "" })).toEqual([{ label: "Facebook", url: "https://facebook.com/x" }])
    expect(websiteLabel("https://www.thaomoc.vn/")).toBe("thaomoc.vn")
    expect(safeEmail("khong-phai-email")).toBeNull()
    expect(shop.email).toBe("lienhe@thaomoc.vn")
  })

  it("cam kết chỉ giữ phần dành cho khách", () => {
    expect(shop.commitments).toEqual([{ id: "c1", title: "Đúng mẫu", customerText: "Làm đúng mẫu đã chọn" }])
  })
})

describe("thông tin cửa hàng — giao diện", () => {
  it("hiện hotline (không bấm gọi), email, website, địa chỉ; cam kết mở sẵn khi vào từ nút cam kết", () => {
    const html = renderToStaticMarkup(createElement(ShopInfoContent, { shop, section: "commitments" }))
    expect(html).toContain("0901234567")
    expect(html).not.toContain("tel:")
    expect(html).toContain("lienhe@thaomoc.vn")
    expect(html).toContain('href="https://shop.thaomoc.vn/"')
    expect(html).toContain("Facebook")
    expect(html).not.toContain("javascript:")
    expect(html).toContain("Làm đúng mẫu đã chọn")
    expect(html).not.toContain("bí mật")
  })

  it("mặc định cam kết thu gọn; tiệm chưa khai email/website thì ẩn", () => {
    const bare = toShopContact({ name: "Tiệm A", phone: null, address: null, logoUrl: null, commitments: [{ id: "c", title: "T", customerText: "Nội dung" }] })
    const html = renderToStaticMarkup(createElement(ShopInfoContent, { shop: bare, section: "info" }))
    expect(html).toContain("Cam kết của cửa hàng (1)")
    expect(html).not.toContain("Nội dung")
    expect(html).not.toContain("Hotline")
    expect(html).not.toContain("Email")
  })

  it("bước xác nhận đơn không còn liệt kê cam kết, chỉ còn lối mở", () => {
    const html = renderToStaticMarkup(createElement(OrderReview, {
      product: { id: "p", code: "A", name: "Bó A", price: 1, imageUrl: null, selectedAt: "2026-10-08T00:00:00.000Z" },
      variantName: null,
      input: { customerName: "a", customerPhone: "0932393944", recipientName: "b", recipientPhone: "0932393955", deliveryDate: "2026-10-09", deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "x" },
      quote: null, submitting: false, error: null, onEdit: () => undefined, onConfirm: () => undefined,
      appliedPolicies: { promotions: [], commitments: [{ id: "c", title: "Cũ", customerText: "Cam kết cũ trong bộ sưu tập" }], agreements: [], allowCustomerPromotionChoice: false },
    }))
    expect(html).toContain("Xem cam kết của cửa hàng")
    expect(html).not.toContain("Cam kết cũ trong bộ sưu tập")
  })
})
