import { describe, expect, it, vi } from "vitest"

import { SUBSCRIPTION_SWEEP_BATCH, SUBSCRIPTION_SWEEP_MAX_PAGES, sweepSubscriptions } from "./sweep-subscriptions"

const rowOf = (organizationId: string, i = 0) => ({ organizationId, cursor: { periodEnd: new Date(Date.UTC(2026, 9, 1)), id: `sub-${String(i).padStart(5, "0")}` } })

describe("sweepSubscriptions (UJ-11)", () => {
  it("lỗi ở một tổ chức không chặn các tổ chức còn lại", async () => {
    const check = vi.fn(async (orgId: string) => {
      if (orgId === "org-2") throw new Error("khoá dòng")
      return { readOnly: false }
    })
    const result = await sweepSubscriptions(new Date(), { list: async () => ["org-1", "org-2", "org-3"].map((o, i) => rowOf(o, i)), check })
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

  it("audit BL-27: hơn một trang (vd. > 200 tổ chức quá hạn) → đi tiếp theo con trỏ, tổ chức cuối vẫn được xét", async () => {
    const all = Array.from({ length: 450 }, (_, i) => rowOf(`org-${i}`, i))
    const list = vi.fn(async (_now: Date, _period: string, limit: number, after?: { id: string }) =>
      all.filter((r) => !after || r.cursor.id > after.id).slice(0, limit))
    const check = vi.fn(async () => ({ readOnly: false }))
    expect(await sweepSubscriptions(new Date(), { list, check })).toEqual({ checked: 450, failed: 0 })
    expect(check).toHaveBeenLastCalledWith("org-449", expect.any(Date))
    expect(list).toHaveBeenCalledTimes(3)
  })

  it("vòng quét có trần trang", async () => {
    let n = 0
    const list = vi.fn(async () => Array.from({ length: SUBSCRIPTION_SWEEP_BATCH }, () => rowOf(`org-${n}`, n++)))
    await sweepSubscriptions(new Date(), { list, check: vi.fn(async () => ({ readOnly: false })) })
    expect(list).toHaveBeenCalledTimes(SUBSCRIPTION_SWEEP_MAX_PAGES)
  })
})
