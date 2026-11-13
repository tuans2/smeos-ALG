import { describe, expect, it } from "vitest"
import { getNotificationEvent } from "./events"
import { fillDeepLink, MAX_RECIPIENTS_PER_EVENT, selectRecipients, openDeepLink } from "./notification-recipients"
import { isHrefOpen } from "@/lib/feature-lock"

const orderReceived = getNotificationEvent("ORDER_RECEIVED")!

describe("selectRecipients", () => {
  const members = [
    { userId: "admin", systemRoleKey: "dieu_hanh" },
    { userId: "sale-owner", systemRoleKey: "sale" },
    { userId: "sale-other", systemRoleKey: "sale" },
    { userId: "mkt", systemRoleKey: "marketing" },
  ]

  it("BROADCAST gửi cả vai, OWNER chỉ người phụ trách, vai không khai báo thì bỏ", () => {
    const got = selectRecipients(orderReceived, members, { organizationType: "SINGLE", ownerUserId: "sale-owner" })
    expect(got.map((r) => [r.userId, r.roleKey])).toEqual([
      ["admin", "store_admin"],
      ["sale-owner", "sales"],
    ])
  })

  it("có trần số người nhận", () => {
    const many = Array.from({ length: MAX_RECIPIENTS_PER_EVENT + 10 }, (_, i) => ({ userId: `u${i}`, systemRoleKey: "dieu_hanh" }))
    expect(selectRecipients(orderReceived, many, { organizationType: "SINGLE" })).toHaveLength(MAX_RECIPIENTS_PER_EVENT)
  })
})

describe("fillDeepLink", () => {
  it("điền biến và mã hoá; thiếu biến thì không gắn link", () => {
    expect(fillDeepLink("/don-hang/{orderId}", { orderId: "a b" })).toBe("/don-hang/a%20b")
    expect(fillDeepLink("/don-hang/{orderId}", {})).toBeUndefined()
    expect(fillDeepLink(undefined, {})).toBeUndefined()
  })
})

describe("openDeepLink (audit N-05)", () => {
  it("bỏ link tới tuyến đang khoá, giữ link tới tuyến mở; tin vẫn gửi được vì chỉ link bị bỏ", () => {
    const lockedOn = (href: string) => isHrefOpen(href, true, false)
    expect(openDeepLink("/dieu-phoi", lockedOn)).toBeUndefined()
    expect(openDeepLink("/so-lieu", lockedOn)).toBeUndefined()
    expect(openDeepLink("/don-hang/abc", lockedOn)).toBe("/don-hang/abc")
    expect(openDeepLink(undefined, lockedOn)).toBeUndefined()
  })

  it("khoá tắt (staging, bản giao GD1): giữ nguyên link", () => {
    expect(openDeepLink("/dieu-phoi", (href) => isHrefOpen(href, false, false))).toBe("/dieu-phoi")
  })
})
