import { describe, expect, it, vi } from "vitest"

import { deriveCustomerTier } from "../../domain/crm-rules"
import { CUSTOMER_METRICS_MAX_PAGES, sweepCustomerMetrics } from "../customer-metrics-sweep"

/** PO 07/11/2026 (kế hoạch logic nghiệp vụ Q6), audit BL-14. */
describe("hạng khách theo ngưỡng ngành", () => {
  it("mặc định giữ ngưỡng ngành hoa", () => {
    expect(deriveCustomerTier(10_000_000, 0)).toBe("VIP")
    expect(deriveCustomerTier(0, 10)).toBe("VIP")
    expect(deriveCustomerTier(600_000, 0)).toBe("BRONZE")
    expect(deriveCustomerTier(0, 0)).toBe("NEW")
  })

  it("ngành khai ngưỡng riêng thì dùng ngưỡng đó", () => {
    const strict = { VIP: { spentVnd: 50_000_000, orders: 50 }, GOLD: { spentVnd: 20_000_000, orders: 20 }, SILVER: { spentVnd: 5_000_000, orders: 8 }, BRONZE: { spentVnd: 1, orders: 1 } }
    expect(deriveCustomerTier(0, 10, strict)).toBe("SILVER")
    expect(deriveCustomerTier(12_000_000, 0, strict)).toBe("SILVER")
  })
})

describe("bộ quét chỉ số khách", () => {
  const row = (org: string, customer: string, at: string) => ({ organization_id: org, customer_id: customer, updated_at: new Date(at) })

  it("tính lại mỗi khách một lần, trả con trỏ là lần đổi cuối", async () => {
    const changed = vi.fn(async () => [row("o1", "c1", "2026-11-07T01:00:00Z"), row("o2", "c1", "2026-11-07T02:00:00Z"), row("o1", "c1", "2026-11-07T03:00:00Z")])
    const sync = vi.fn(async () => undefined)
    const r = await sweepCustomerMetrics(new Date("2026-11-07T00:00:00Z"), { changed, sync })
    expect(sync.mock.calls).toEqual([["o1", "c1"], ["o2", "c1"]])
    expect(r).toMatchObject({ synced: 2, failed: 0, nextSince: new Date("2026-11-07T03:00:00Z") })
  })

  it("lỗi một khách không dừng cả lượt; vòng quét có trần trang", async () => {
    let n = 0
    const changed = vi.fn(async () => Array.from({ length: 200 }, () => row("o1", `c${n++}`, "2026-11-07T01:00:00Z")))
    const sync = vi.fn(async (_o: string, c: string) => { if (c === "c0") throw new Error("hỏng") })
    const r = await sweepCustomerMetrics(new Date(0), { changed, sync })
    expect(changed).toHaveBeenCalledTimes(CUSTOMER_METRICS_MAX_PAGES)
    expect(r.failed).toBe(1)
  })
})
