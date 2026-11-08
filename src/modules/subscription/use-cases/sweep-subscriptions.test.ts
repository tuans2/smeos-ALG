import { describe, expect, it, vi } from "vitest"

import { sweepSubscriptions } from "./sweep-subscriptions"

describe("sweepSubscriptions (UJ-11)", () => {
  it("lỗi ở một tổ chức không chặn các tổ chức còn lại", async () => {
    const check = vi.fn(async (orgId: string) => {
      if (orgId === "org-2") throw new Error("khoá dòng")
      return { readOnly: false }
    })
    const result = await sweepSubscriptions(new Date(), { list: async () => ["org-1", "org-2", "org-3"], check })
    expect(result).toEqual({ checked: 3, failed: 1 })
    expect(check).toHaveBeenCalledTimes(3)
  })

  it("không đọc được danh sách → null, không ném lỗi làm hỏng lượt quét chung", async () => {
    const result = await sweepSubscriptions(new Date(), {
      list: async () => { throw new Error("mất kết nối") },
      check: vi.fn(),
    })
    expect(result).toBeNull()
  })
})
