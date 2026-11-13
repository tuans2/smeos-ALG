import { describe, expect, it } from "vitest"
import { resolveNotificationViewerTier } from "./notification-viewer-tier"

describe("tầng ma trận thông báo theo loại tổ chức (AUD-024)", () => {
  it("tổ chức chuỗi (CHAIN) dùng ma trận Chuỗi", () => {
    expect(resolveNotificationViewerTier("CHAIN")).toBe("CHAIN")
  })

  it("cửa hàng đơn lẻ và mặc định dùng ma trận Cửa hàng", () => {
    expect(resolveNotificationViewerTier("SINGLE")).toBe("STORE")
    expect(resolveNotificationViewerTier("STORE")).toBe("STORE")
    expect(resolveNotificationViewerTier(null)).toBe("STORE")
  })
})
