import { describe, expect, it } from "vitest"

import { isInfoRequestOverdue, missingInfoFields } from "../order-info-gaps"

describe("đơn thiếu thông tin (checklist ALG 4.14)", () => {
  it("đơn trống thiếu địa chỉ và SĐT người nhận; lời chúc chỉ bắt buộc khi có thiệp", () => {
    expect(missingInfoFields({ deliveryAddress: null, coordinationMeta: null, cardMessage: null, cardRequired: false })).toEqual(["deliveryAddress", "recipientPhone"])
    expect(missingInfoFields({ deliveryAddress: null, coordinationMeta: null, cardMessage: " ", cardRequired: true })).toContain("cardMessage")
  })

  it("đọc SĐT từ địa chỉ đơn đa nguồn hoặc từ metadata đơn Điều phối", () => {
    expect(missingInfoFields({ deliveryAddress: { street: "12 Phố Huế", phone: "0901234567" }, coordinationMeta: null, cardMessage: null, cardRequired: false })).toEqual([])
    expect(missingInfoFields({ deliveryAddress: { street: "12 Phố Huế" }, coordinationMeta: { recipientPhone: "0901234567" }, cardMessage: "Chúc mừng", cardRequired: true })).toEqual([])
  })

  it("quá hạn chỉ với yêu cầu còn mở có hạn", () => {
    const now = new Date("2026-11-04T10:00:00Z")
    const past = new Date("2026-11-04T09:00:00Z")
    expect(isInfoRequestOverdue("OPEN", past, now)).toBe(true)
    expect(isInfoRequestOverdue("RECEIVED", past, now)).toBe(false)
    expect(isInfoRequestOverdue("OPEN", null, now)).toBe(false)
  })
})
