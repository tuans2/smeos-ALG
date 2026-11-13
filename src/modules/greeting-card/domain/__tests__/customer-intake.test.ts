import { describe, it, expect } from "vitest"
import { validateCustomerOrderInput } from "../greeting-card-rules"
import { publicOrderBodySchema } from "../../contracts/public-order-schema"

describe("Customer Intake & Contact Flow", () => {
  const validBase = {
    customerName: "Nguyễn Văn A",
    customerPhone: "0901234567",
    recipientName: "Trần Thị B",
    recipientPhone: "0987654321",
    deliveryDate: "2026-12-25",
    deliveryAddress: "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
  }

  describe("validateCustomerOrderInput", () => {
    it("hợp lệ khi chỉ cung cấp Tên và Số điện thoại (Email không bắt buộc)", () => {
      const result = validateCustomerOrderInput(validBase)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors).length).toBe(0)
    })

    it("hợp lệ khi cung cấp đầy đủ Tên, Số điện thoại và Email hợp lệ", () => {
      const result = validateCustomerOrderInput({
        ...validBase,
        customerEmail: "khachhang@example.com",
      })
      expect(result.valid).toBe(true)
      expect(result.errors.customerEmail).toBeUndefined()
    })

    it("báo lỗi khi email sai định dạng", () => {
      const result = validateCustomerOrderInput({
        ...validBase,
        customerEmail: "email-khong-hop-le",
      })
      expect(result.valid).toBe(false)
      expect(result.errors.customerEmail).toBe("Email người đặt không hợp lệ")
    })

    it("chấp nhận email là chuỗi rỗng hoặc chỉ có khoảng trắng", () => {
      const result = validateCustomerOrderInput({
        ...validBase,
        customerEmail: "   ",
      })
      expect(result.valid).toBe(true)
    })
  })

  describe("publicOrderBodySchema", () => {
    it("parse thành công với input có customerEmail hợp lệ", () => {
      const parsed = publicOrderBodySchema.safeParse({
        ...validBase,
        customerEmail: "customer@gmail.com",
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.customerEmail).toBe("customer@gmail.com")
      }
    })

    it("parse thành công khi không có customerEmail (optional)", () => {
      const parsed = publicOrderBodySchema.safeParse(validBase)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.customerEmail).toBeUndefined()
      }
    })
  })

  describe("intakePromotionCta Settings & Policy Resolution", () => {
    it("mặc định bật CTA ưu đãi 10% khi chưa có cấu hình", async () => {
      const { parseStorePolicies, resolveAppliedPolicies } = await import("../store-policy")
      const policies = parseStorePolicies(null)
      expect(policies.intakePromotionCta).toEqual({ enabled: true, percent: 10 })

      const applied = resolveAppliedPolicies(null, null)
      expect(applied.intakePromotionCta).toEqual({ enabled: true, percent: 10 })
    })

    it("cho phép điều hành thay đổi số % giảm giá (ví dụ 15%)", async () => {
      const { resolveAppliedPolicies } = await import("../store-policy")
      const orgSettings = {
        store_policies: {
          intakePromotionCta: { enabled: true, percent: 15 },
        },
      }
      const applied = resolveAppliedPolicies(null, orgSettings)
      expect(applied.intakePromotionCta).toEqual({ enabled: true, percent: 15 })
    })

    it("cho phép điều hành tắt hiển thị dòng ưu đãi", async () => {
      const { resolveAppliedPolicies } = await import("../store-policy")
      const orgSettings = {
        store_policies: {
          intakePromotionCta: { enabled: false, percent: 20 },
        },
      }
      const applied = resolveAppliedPolicies(null, orgSettings)
      expect(applied.intakePromotionCta?.enabled).toBe(false)
    })

    it("cho phép bộ sưu tập ghi đè cấu hình ưu đãi của tiệm", async () => {
      const { resolveAppliedPolicies } = await import("../store-policy")
      const orgSettings = {
        store_policies: {
          intakePromotionCta: { enabled: true, percent: 10 },
        },
      }
      const catalogFilters = {
        appliedPolicies: {
          intakePromotionCta: { enabled: false },
        },
      }
      const applied = resolveAppliedPolicies(catalogFilters, orgSettings)
      expect(applied.intakePromotionCta?.enabled).toBe(false)
    })
  })
})
