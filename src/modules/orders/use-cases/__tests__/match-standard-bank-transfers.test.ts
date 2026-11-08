import { describe, expect, it, vi } from "vitest"

import { BANK_MATCH_MAX_PAGES, matchStandardBankTransfers } from "../match-standard-bank-transfers"

const event = (id: string, content: string, org = "org-1", createdAt = new Date("2026-11-07T00:00:00Z")) => ({
  id, organization_id: org, provider: "SEPAY", external_id: `x-${id}`, amount_vnd: 300_000, content, created_at: createdAt,
})

describe("khớp chuyển khoản cho đơn ngoài Thẻ chào", () => {
  it("ghi thu đúng tổ chức của giao dịch, theo mã đơn, kèm dòng ngân hàng để khoá trong cùng giao dịch", async () => {
    const repo = {
      listUnmatched: vi.fn(async () => [event("e1", "DH251031-0001 chuyen coc"), event("e2", "khong co ma"), event("e3", "DH251031-0002", "org-2")]),
      record: vi.fn(async (ctx: { organizationId: string }, where: { code: string }) => {
        if (where.code === "DH251031-0002") throw new Error("not found")
        return { orderId: "o", orderCode: where.code, paymentId: "p", kind: "DEPOSIT", paidVnd: 1, balanceVnd: 1, org: ctx.organizationId }
      }),
    }
    const r = await matchStandardBankTransfers(new Date(), repo as never)
    expect(r).toEqual({ scanned: 3, matched: 1, skipped: 2 })
    const [ctx, where, input, eventId] = repo.record.mock.calls[0] as unknown as [{ organizationId: string; userId: string }, unknown, { amountVnd: number; method: string }, string]
    expect(ctx).toMatchObject({ organizationId: "org-1", userId: "system:sepay-orders" })
    expect(where).toEqual({ code: "DH251031-0001" })
    expect(input).toMatchObject({ amountVnd: 300_000, method: "BANK_TRANSFER" })
    expect(eventId).toBe("e1")
  })

  // Audit BL-09 (06/11/2026): dòng không khớp được vẫn "chưa khớp" → không có con trỏ thì mỗi lượt quét lại đúng
  // 100 dòng cũ nhất, giao dịch thứ 101 trở đi không bao giờ được xét.
  it("101 dòng không khớp được + 1 dòng có mã ở trang 2 → dòng có mã vẫn được ghi thu", async () => {
    const all = Array.from({ length: 101 }, (_, i) => event(`n${String(i).padStart(3, "0")}`, "khong co ma", "org-1", new Date(Date.UTC(2026, 10, 7, 0, 0, i))))
    all.push(event("z-match", "DH261107-0001", "org-1", new Date(Date.UTC(2026, 10, 7, 1))))
    const listUnmatched = vi.fn(async (_since: Date, take: number, after?: { createdAt: Date; id: string }) => {
      const start = after ? all.findIndex((e) => e.id === after.id) + 1 : 0
      return all.slice(start, start + take)
    })
    const record = vi.fn(async (..._args: unknown[]) => ({}))
    const r = await matchStandardBankTransfers(new Date("2026-11-07T02:00:00Z"), { listUnmatched, record } as never)
    expect(r).toEqual({ scanned: 102, matched: 1, skipped: 101 })
    expect(listUnmatched).toHaveBeenCalledTimes(2)
    expect(listUnmatched.mock.calls[1]?.[2]).toEqual({ createdAt: all[99]!.created_at, id: all[99]!.id })
    expect(record.mock.calls[0]?.[3]).toBe("z-match")
  })

  it("vòng quét có trần trang", async () => {
    const page = Array.from({ length: 100 }, (_, i) => event(`p${i}`, "khong co ma"))
    const listUnmatched = vi.fn(async () => page)
    await matchStandardBankTransfers(new Date(), { listUnmatched, record: vi.fn() } as never)
    expect(listUnmatched).toHaveBeenCalledTimes(BANK_MATCH_MAX_PAGES)
  })
})
