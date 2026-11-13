import { describe, it, expect } from "vitest"
import {
  CHANNEL_PRICING_CATALOG,
  getChannelPricing,
  isChannelSubscriptionActive,
  canActivateChannel,
  calculateNewExpiry,
  validateChannelCredentials,
} from "@/modules/chat-assistant/domain/channel-integration-rules"

describe("Omnichannel Chat Integration & Monetization Rules (M08)", () => {
  describe("Biểu Phí Niêm Yết Nền Tảng (Pricing Catalog)", () => {
    it("mọi kênh đều có thông tin định giá và biểu phí rõ ràng", () => {
      expect(CHANNEL_PRICING_CATALOG.STOREFRONT_CATALOG.isFree).toBe(true)
      expect(CHANNEL_PRICING_CATALOG.STOREFRONT_CATALOG.monthlyCreditCost).toBe(0)

      expect(CHANNEL_PRICING_CATALOG.FACEBOOK_MESSENGER.isFree).toBe(false)
      expect(CHANNEL_PRICING_CATALOG.FACEBOOK_MESSENGER.monthlyCreditCost).toBe(50)

      expect(CHANNEL_PRICING_CATALOG.ZALO_OA.isFree).toBe(false)
      expect(CHANNEL_PRICING_CATALOG.ZALO_OA.monthlyCreditCost).toBe(70)

      expect(CHANNEL_PRICING_CATALOG.EMBEDDED_WIDGET.isFree).toBe(false)
      expect(CHANNEL_PRICING_CATALOG.EMBEDDED_WIDGET.monthlyCreditCost).toBe(30)
    })
  })

  describe("Chốt chặn kích hoạt kênh (canActivateChannel)", () => {
    it("cho phép kích hoạt kênh miễn phí với số dư 0 credit", () => {
      const check = canActivateChannel("STOREFRONT_CATALOG", 0)
      expect(check.allowed).toBe(true)
      expect(check.requiredCredit).toBe(0)
    })

    it("chặn kích hoạt Facebook Messenger khi số dư không đủ 50 credit", () => {
      const check = canActivateChannel("FACEBOOK_MESSENGER", 30)
      expect(check.allowed).toBe(false)
      expect(check.requiredCredit).toBe(50)
      expect(check.reason).toContain("không đủ")
    })

    it("cho phép kích hoạt Facebook Messenger khi số dư >= 50 credit", () => {
      const check = canActivateChannel("FACEBOOK_MESSENGER", 100)
      expect(check.allowed).toBe(true)
      expect(check.requiredCredit).toBe(50)
    })

    it("không trừ credit nếu thuê bao kênh vẫn đang còn hạn", () => {
      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      const check = canActivateChannel("FACEBOOK_MESSENGER", 0, futureDate)
      expect(check.allowed).toBe(true)
      expect(check.requiredCredit).toBe(0)
    })
  })

  describe("Tính thời hạn thuê bao (calculateNewExpiry)", () => {
    it("gia hạn 30 ngày từ thời điểm hiện tại nếu chưa có hạn cũ", () => {
      const before = Date.now()
      const expiry = calculateNewExpiry(null, 30)
      const diffDays = Math.round((expiry.getTime() - before) / (24 * 60 * 60 * 1000))
      expect(diffDays).toBe(30)
    })

    it("cộng dồn 30 ngày từ hạn cũ nếu hạn cũ vẫn còn", () => {
      const current = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      const newExpiry = calculateNewExpiry(current, 30)
      const diffDays = Math.round((newExpiry.getTime() - current.getTime()) / (24 * 60 * 60 * 1000))
      expect(diffDays).toBe(30)
    })
  })

  describe("Kiểm tra thông số API credentials (validateChannelCredentials)", () => {
    it("báo lỗi nếu thiếu Facebook Page ID hoặc Access Token", () => {
      const res = validateChannelCredentials("FACEBOOK_MESSENGER", {})
      expect(res.valid).toBe(false)
      expect(res.errors.length).toBeGreaterThan(0)
    })

    it("hợp lệ khi có đầy đủ Facebook Page ID và Page Access Token", () => {
      const res = validateChannelCredentials("FACEBOOK_MESSENGER", {
        fbPageId: "123456",
        fbPageAccessToken: "EAAG...",
      })
      expect(res.valid).toBe(true)
      expect(res.errors).toEqual([])
    })

    it("báo lỗi nếu thiếu Zalo OA ID", () => {
      const res = validateChannelCredentials("ZALO_OA", {})
      expect(res.valid).toBe(false)
    })

    it("chỉ có Access Token thì chưa đủ: thiếu App ID + Secret Key, webhook không kiểm được chữ ký (AUD-028)", () => {
      const res = validateChannelCredentials("ZALO_OA", {
        zaloOaId: "987654",
        zaloAccessToken: "oa_token_123",
      })
      expect(res.valid).toBe(false)
      expect(res.errors).toContain("Chưa nhập Zalo Secret Key để xác thực tin nhắn đến")
    })

    it("hợp lệ khi có Zalo OA ID, App ID và Secret Key", () => {
      const res = validateChannelCredentials("ZALO_OA", {
        zaloOaId: "987654",
        zaloAppId: "app-1",
        zaloSecretKey: "secret-1",
        zaloAccessToken: "oa_token_123",
      })
      expect(res.valid).toBe(true)
    })
  })

  describe("Trạng thái thuê bao kênh (isChannelSubscriptionActive)", () => {
    it("kênh miễn phí luôn active nếu đang bật", () => {
      expect(isChannelSubscriptionActive("STOREFRONT_CATALOG", true)).toBe(true)
      expect(isChannelSubscriptionActive("STOREFRONT_CATALOG", false)).toBe(false)
    })

    it("kênh có phí chỉ active khi đang bật và chưa hết hạn", () => {
      const future = new Date(Date.now() + 100000)
      const past = new Date(Date.now() - 100000)

      expect(isChannelSubscriptionActive("FACEBOOK_MESSENGER", true, future)).toBe(true)
      expect(isChannelSubscriptionActive("FACEBOOK_MESSENGER", true, past)).toBe(false)
      expect(isChannelSubscriptionActive("FACEBOOK_MESSENGER", false, future)).toBe(false)
    })
  })
})
