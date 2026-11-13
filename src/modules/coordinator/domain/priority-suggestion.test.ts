import { describe, expect, it } from "vitest"
import { suggestPriority } from "./priority-suggestion"

describe("suggestPriority (ĐP-4a.1, §2.15.1)", () => {
  it("mặc định NORMAL khi không có gì đặc biệt", () => {
    expect(suggestPriority({})).toBe("NORMAL")
    expect(suggestPriority({ serviceLevel: "SAME_DAY", customerTier: "BRONZE" })).toBe("NORMAL")
  })

  it("HIGH khi khách GOLD hoặc VIP", () => {
    expect(suggestPriority({ customerTier: "GOLD" })).toBe("HIGH")
    expect(suggestPriority({ customerTier: "VIP" })).toBe("HIGH")
  })

  it("URGENT khi serviceLevel = EXPRESS, kể cả khách thường", () => {
    expect(suggestPriority({ serviceLevel: "EXPRESS", customerTier: "NEW" })).toBe("URGENT")
  })

  it("URGENT (EXPRESS) thắng HIGH (khách GOLD) — giờ giao gấp quan trọng hơn hạng khách", () => {
    expect(suggestPriority({ serviceLevel: "EXPRESS", customerTier: "GOLD" })).toBe("URGENT")
  })

  it("CRITICAL khi hẹn đúng giờ + loại đơn có giờ cố định không lùi được", () => {
    expect(suggestPriority({ serviceLevel: "EXACT_TIME", orderType: "SYMPATHY" })).toBe("CRITICAL")
    expect(suggestPriority({ serviceLevel: "EXACT_TIME", orderType: "GRAND_OPENING" })).toBe("CRITICAL")
    expect(suggestPriority({ serviceLevel: "EXACT_TIME", orderType: "WEDDING_EVENT" })).toBe("CRITICAL")
  })

  it("hẹn đúng giờ nhưng loại đơn KHÔNG thuộc nhóm giờ cố định thì không phải CRITICAL", () => {
    expect(suggestPriority({ serviceLevel: "EXACT_TIME", orderType: "GIFT" })).toBe("NORMAL")
  })

  it("CRITICAL thắng mọi mức khác kể cả khách VIP", () => {
    expect(suggestPriority({ serviceLevel: "EXACT_TIME", orderType: "SYMPATHY", customerTier: "VIP" })).toBe("CRITICAL")
  })
})
