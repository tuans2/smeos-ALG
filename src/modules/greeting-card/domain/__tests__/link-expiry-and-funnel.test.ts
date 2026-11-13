import { describe, it, expect } from "vitest"
import { linkAvailability } from "../greeting-card-rules"
import { LINK_LIFETIME_SETTINGS_KEY, formatLinkLifetime, linkExpiryFrom, parseLinkLifetimeHours } from "../link-lifetime"
import { buildSalesFunnel } from "../sales-funnel"

describe("thời gian dùng được của link", () => {
  const now = new Date("2026-10-05T00:00:00Z")
  it("mặc định 24 giờ; giá trị cài sai hoặc ngoài [1, 720] quay về mặc định", () => {
    expect(parseLinkLifetimeHours(null)).toBe(24)
    expect(parseLinkLifetimeHours({ [LINK_LIFETIME_SETTINGS_KEY]: 48 })).toBe(48)
    expect(parseLinkLifetimeHours({ [LINK_LIFETIME_SETTINGS_KEY]: 0 })).toBe(24)
    expect(parseLinkLifetimeHours({ [LINK_LIFETIME_SETTINGS_KEY]: 721 })).toBe(24)
    expect(parseLinkLifetimeHours({ [LINK_LIFETIME_SETTINGS_KEY]: "12" })).toBe(24)
    expect(linkExpiryFrom(24, now).toISOString()).toBe("2026-10-06T00:00:00.000Z")
    expect(linkExpiryFrom(3, now).toISOString()).toBe("2026-10-05T03:00:00.000Z")
  })
  it("hiển thị dễ đọc", () => {
    expect(formatLinkLifetime(5)).toBe("5 giờ")
    expect(formatLinkLifetime(72)).toBe("3 ngày")
    expect(formatLinkLifetime(30)).toBe("1 ngày 6 giờ")
  })
})

describe("linkAvailability", () => {
  const now = new Date("2026-10-05T00:00:00Z")
  const past = new Date("2026-10-01T00:00:00Z")
  it("hết hạn / thu hồi chỉ áp dụng khi chưa có đơn", () => {
    expect(linkAvailability({ expiresAt: past, revokedAt: null, hasOrder: false }, now)).toBe("EXPIRED")
    expect(linkAvailability({ expiresAt: null, revokedAt: past, hasOrder: false }, now)).toBe("REVOKED")
    expect(linkAvailability({ expiresAt: past, revokedAt: past, hasOrder: true }, now)).toBe("ACTIVE")
    expect(linkAvailability({ expiresAt: null, revokedAt: null, hasOrder: false }, now)).toBe("ACTIVE")
  })
})

describe("buildSalesFunnel", () => {
  it("tính tỷ lệ, sắp theo doanh thu, có dòng tổng và tên link công khai", () => {
    const { rows, total } = buildSalesFunnel(
      [
        { saleId: "u1", sent: 10, opened: 8, selected: 5, ordered: 4, paid: 3, revenueVnd: 2_000_000 },
        { saleId: "public", sent: 2, opened: 2, selected: 2, ordered: 2, paid: 1, revenueVnd: 3_000_000 },
        { saleId: "gone", sent: 3, opened: 0, selected: 0, ordered: 0, paid: 0, revenueVnd: 0 },
      ],
      new Map([["u1", "Lan"]])
    )
    expect(rows.map((r) => r.saleName)).toEqual(["Link bộ sưu tập công khai", "Lan", "Nhân viên đã rời"])
    expect(rows[1]?.openRate).toBe(80)
    expect(total.sent).toBe(15)
    expect(total.paidRate).toBe(26.7)
    expect(rows[2]?.orderRate).toBe(0)
  })
})
