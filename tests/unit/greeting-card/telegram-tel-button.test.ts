import { describe, expect, it } from "vitest"

import { splitTelegramActions } from "@/modules/greeting-card/adapters/staff-channels/telegram-adapter"

describe("splitTelegramActions", () => {
  it("nút tel: không thành nút Telegram (Telegram từ chối cả tin) mà thành dòng chữ", () => {
    const { buttons, phoneLines } = splitTelegramActions([
      { text: "Gọi chi nhánh", url: "tel:0977 234 567" },
      { text: "Xem đơn hàng", url: "https://smeos.example/don/1" },
    ])
    expect(buttons).toEqual([{ text: "Xem đơn hàng", url: "https://smeos.example/don/1" }])
    expect(phoneLines).toEqual(["📞 Gọi chi nhánh: 0977234567"])
  })

  it("không lặp số khi nhãn đã chứa số, và thoát ký tự HTML", () => {
    const { phoneLines } = splitTelegramActions([{ text: "Gọi <CN>: 0977234567", url: "tel:0977234567" }])
    expect(phoneLines).toEqual(["📞 Gọi &lt;CN&gt;: 0977234567"])
  })

  it("bỏ URL rỗng và giao thức lạ", () => {
    const { buttons, phoneLines } = splitTelegramActions([
      { text: "a", url: " " },
      { text: "b", url: "javascript:alert(1)" },
    ])
    expect(buttons).toEqual([])
    expect(phoneLines).toEqual([])
  })
})
