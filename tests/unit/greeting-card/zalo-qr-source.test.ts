import { describe, expect, it } from "vitest"
import { zaloQrUrlFromBrandAssets } from "@/modules/greeting-card/domain/shop-contact"

/** Cửa sổ "Quét mã kết nối Zalo" không được hiện mã QR ngân hàng (PO 08/10/2026). */
describe("zaloQrUrlFromBrandAssets", () => {
  it("chỉ lấy ô Mã QR Zalo", () => {
    expect(zaloQrUrlFromBrandAssets({ zalo_qr: "https://cdn.example.com/zalo.png" })).toBe("https://cdn.example.com/zalo.png")
  })

  it("ô qr_code cũ (từng nhận mã ngân hàng, dữ liệu mẫu VietQR) bị bỏ qua", () => {
    expect(zaloQrUrlFromBrandAssets({ qr_code: "/brand/moc-lan-qr.svg" })).toBeNull()
  })

  it("dữ liệu hỏng / đường dẫn không an toàn → null để trang khách tự sinh QR từ link Zalo", () => {
    expect(zaloQrUrlFromBrandAssets(null)).toBeNull()
    expect(zaloQrUrlFromBrandAssets({ zalo_qr: "javascript:alert(1)" })).toBeNull()
    expect(zaloQrUrlFromBrandAssets({ zalo_qr: "http://insecure.example.com/a.png" })).toBeNull()
  })
})
