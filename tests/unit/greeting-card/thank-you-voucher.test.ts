import { describe, expect, it } from "vitest"
import {
  readThankYouPolicy, thankYouBatchInput, thankYouBatchName, thankYouEligible,
} from "@/modules/greeting-card/domain/thank-you-voucher"
import { validateVoucherBatch } from "@/modules/promotions/domain/voucher-batch"
import { readSavedBuyer, rememberBuyer } from "@/components/greeting-card/customer/saved-buyer"

describe("mã cảm ơn (ALG 5.15)", () => {
  const now = new Date("2026-11-05T00:00:00Z")
  it("mặc định tắt; số ngoài khoảng về mặc định", () => {
    expect(readThankYouPolicy(null)).toEqual({ enabled: false, percent: 10, validDays: 60 })
    expect(readThankYouPolicy({ greetingCardThankYou: { enabled: true, percent: 500, validDays: 0 } })).toEqual({ enabled: true, percent: 10, validDays: 60 })
  })
  it("một mã, một lượt, một lượt mỗi khách; không vượt trần giảm giá; hợp lệ theo luật phát hành", () => {
    const batch = thankYouBatchInput("DH-001", { enabled: true, percent: 40, validDays: 30 }, 25, now)
    expect(batch).toMatchObject({ name: thankYouBatchName("DH-001"), quantity: 1, usageLimit: 1, perCustomerLimit: 1, discountValue: 25 })
    expect(batch.expiresAt?.toISOString()).toBe("2026-12-05T00:00:00.000Z")
    expect(validateVoucherBatch(batch, { maxDiscountPercent: 25, activePromotionIds: new Set() })).toEqual({})
  })
  it("chỉ đơn đã giao/hoàn tất, có khách, tiệm bật", () => {
    const on = { enabled: true, percent: 10, validDays: 60 }
    expect(thankYouEligible({ status: "COMPLETED", deliveryStatus: "PENDING", customerId: "c" }, on)).toBe(true)
    expect(thankYouEligible({ status: "CONFIRMED", deliveryStatus: "DELIVERED", customerId: "c" }, on)).toBe(true)
    expect(thankYouEligible({ status: "CONFIRMED", deliveryStatus: "PENDING", customerId: "c" }, on)).toBe(false)
    expect(thankYouEligible({ status: "COMPLETED", deliveryStatus: "DELIVERED", customerId: null }, on)).toBe(false)
    expect(thankYouEligible({ status: "COMPLETED", deliveryStatus: "DELIVERED", customerId: "c" }, { ...on, enabled: false })).toBe(false)
  })
})

describe("lưu thông tin người đặt theo đồng ý (ALG 5.15)", () => {
  function memory() {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
  }
  const buyer = { customerName: " Lan ", customerPhone: "0987654321", customerEmail: "" }
  it("đồng ý → lưu; không đồng ý → xoá; quá 180 ngày → bỏ", () => {
    const s = memory()
    rememberBuyer(true, buyer, s, 0)
    expect(readSavedBuyer(s, 1000)).toEqual({ customerName: "Lan", customerPhone: "0987654321", customerEmail: "" })
    expect(readSavedBuyer(s, 181 * 86_400_000)).toBeNull()
    rememberBuyer(true, buyer, s, 0)
    rememberBuyer(false, buyer, s, 0)
    expect(readSavedBuyer(s, 1000)).toBeNull()
  })
})
