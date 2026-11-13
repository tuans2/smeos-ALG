import { describe, it, expect } from "vitest"
import {
  DEMO_SHOP_NAME,
  DEMO_SHOP_PHONE_DIGITS,
  DEMO_SHOP_PROFILE_MESSAGE,
  CONFIRMED_DEMO_CONTACT_SETTINGS_KEY,
  demoShopContactGap,
  isConfirmedDemoContact,
  isDemoShopContact,
  shopProfileGap,
} from "../shop-contact"

describe("shop-contact-readiness (PO 08/10/2026 & UX xác nhận sử dụng)", () => {
  it("phát hiện cả tên và số điện thoại mẫu", () => {
    const contact = { name: DEMO_SHOP_NAME, phone: "0900 123 456" }
    expect(isDemoShopContact(contact)).toBe(true)
    expect(demoShopContactGap(contact)).toBe(DEMO_SHOP_PROFILE_MESSAGE)
    expect(shopProfileGap(contact)).toBe(DEMO_SHOP_PROFILE_MESSAGE)
  })

  it("phát hiện chỉ tên là mẫu khi số điện thoại đã đổi", () => {
    const contact = { name: DEMO_SHOP_NAME, phone: "0912 345 678" }
    expect(isDemoShopContact(contact)).toBe(true)
    expect(demoShopContactGap(contact)).toBe(
      `Tên cửa hàng vẫn là tên mẫu (${DEMO_SHOP_NAME}). Vào Hồ sơ cửa hàng sửa tên thật trước khi gửi link cho khách.`
    )
    expect(shopProfileGap(contact)).toBe(
      `Tên cửa hàng vẫn là tên mẫu (${DEMO_SHOP_NAME}). Vào Hồ sơ cửa hàng sửa tên thật trước khi gửi link cho khách.`
    )
  })

  it("phát hiện chỉ số điện thoại là mẫu khi tên đã đổi (Homestay Villa Mây Sơn)", () => {
    const contact = { name: "Homestay Villa Mây Sơn", phone: "0900 123 456" }
    expect(isDemoShopContact(contact)).toBe(true)
    expect(demoShopContactGap(contact)).toBe(
      "Số điện thoại cửa hàng (0900 123 456) đang trùng với số điện thoại mẫu của hệ thống."
    )
    expect(shopProfileGap(contact)).toBe(
      "Số điện thoại cửa hàng (0900 123 456) đang trùng với số điện thoại mẫu của hệ thống."
    )
  })

  it("cho phép tiếp tục khi Điều hành đã xác nhận sử dụng thông tin", () => {
    const contact = { name: "Homestay Villa Mây Sơn", phone: "0900 123 456" }
    const settings = { [CONFIRMED_DEMO_CONTACT_SETTINGS_KEY]: true }

    expect(isConfirmedDemoContact(settings)).toBe(true)
    expect(isDemoShopContact(contact, true)).toBe(false)
    expect(shopProfileGap(contact, true)).toBeNull()
  })

  it("trả về null khi tên và số điện thoại đều thật", () => {
    const contact = { name: "Homestay Villa Mây Sơn", phone: "0987 654 321" }
    expect(isDemoShopContact(contact)).toBe(false)
    expect(demoShopContactGap(contact)).toBeNull()
    expect(shopProfileGap(contact)).toBeNull()
  })

  it("vẫn cảnh báo khi thiếu số điện thoại kể cả khi đã xác nhận", () => {
    const contact = { name: "Homestay Villa Mây Sơn", phone: "" }
    expect(shopProfileGap(contact, true)).toBe(
      "Hồ sơ cửa hàng chưa có số điện thoại — khách sẽ không gọi hoặc nhắn Zalo cho cửa hàng được từ trang đặt hàng."
    )
  })
})
