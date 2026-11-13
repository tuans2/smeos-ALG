import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { decideDeliverBeforePay, requestDeliverBeforePay } from "../deliver-before-pay"

const ctx = { organizationId: "org-1", userId: "sale-1", capabilities: new Set<string>() } as unknown as TenantContext
const strict = { brochure_policy: { require_full_before_dispatch: true } }

function repo(over: { total?: number; settings?: unknown; completed?: number; open?: boolean; order?: unknown } = {}) {
  return {
    findOrder: vi.fn(async () => over.order === null ? null : {
      id: "o-1", code: "DH-1", source: "MANUAL", status: "DRAFT", total_vnd: over.total ?? 800_000, paid_vnd: 0,
      customer_id: "c-1", delivery_window: null, owner_sale_id: null,
    }),
    orgSettings: vi.fn(async () => over.settings ?? strict),
    customerStats: vi.fn(async () => ({ completedOrders: over.completed ?? 3, hasOverdueDebt: false })),
    hasOpenRequest: vi.fn(async () => over.open ?? false),
    create: vi.fn(async (_c: unknown, _o: unknown, req: { status: string; basis: string | null; collectDueAt: Date | null }, _reason: string) => ({ id: "r-1", status: req.status, basis: req.basis, collect_due_at: req.collectDueAt })),
    findRequest: vi.fn(),
    decide: vi.fn(),
    list: vi.fn(),
  }
}

describe("Sale xin giao trước, thu sau", () => {
  it("trong hạn mức → tự duyệt, đơn sang Điều phối cùng giao dịch", async () => {
    const r = repo()
    const notify = vi.fn(async () => 1)
    const out = await requestDeliverBeforePay(ctx, "o-1", { reason: "Khách quen" }, r as never, new Date(), notify)
    expect(notify).not.toHaveBeenCalled()
    expect(out.request).toMatchObject({ status: "AUTO_APPROVED", basis: "SELF_LIMIT" })
    expect(r.create.mock.calls[0]?.[3]).toContain("Trong hạn mức Sale tự quyết")
  })

  it("ngoài hạn mức → chờ Điều hành, không chuyển Điều phối", async () => {
    const r = repo({ total: 3_000_000 })
    const notify = vi.fn(async () => 1)
    const out = await requestDeliverBeforePay(ctx, "o-1", { reason: "Khách công ty" }, r as never, new Date(), notify)
    expect(out.request.status).toBe("PENDING")
    expect(r.create.mock.calls[0]?.[3]).toBe("")
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", eventKey: "ORDER_DELIVER_BEFORE_PAY_REQUESTED", deepLink: "/don-hang?tab=approve" }))
  })

  it("thiếu lý do → 422; đơn không thuộc tổ chức hoặc là Thẻ chào → 404; đã có yêu cầu mở → 409", async () => {
    await expect(requestDeliverBeforePay(ctx, "o-1", { reason: " " }, repo() as never)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(requestDeliverBeforePay(ctx, "o-1", { reason: "x" }, repo({ order: null }) as never)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(requestDeliverBeforePay(ctx, "o-1", { reason: "x" }, repo({ open: true }) as never)).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("đơn chưa có giá → báo giá trước", async () => {
    await expect(requestDeliverBeforePay(ctx, "o-1", { reason: "x" }, repo({ total: 0 }) as never)).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
  })
})

describe("Điều hành quyết định", () => {
  const pending = { id: "r-1", kind: "DELIVER_BEFORE_PAY", reason: "Khách công ty", order: { id: "o-1", source: "MANUAL", status: "DRAFT" } }

  it("từ chối bắt buộc ghi lý do", async () => {
    const r = repo()
    await expect(decideDeliverBeforePay(ctx, "r-1", { approve: false }, r as never)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(r.decide).not.toHaveBeenCalled()
  })

  it("đã có người xử lý → 409; yêu cầu của đơn Thẻ chào → 404", async () => {
    const r = repo()
    r.findRequest.mockResolvedValue(pending)
    r.decide.mockResolvedValue(false)
    await expect(decideDeliverBeforePay(ctx, "r-1", { approve: true }, r as never)).rejects.toMatchObject({ code: "CONFLICT" })
    r.findRequest.mockResolvedValue({ ...pending, order: { ...pending.order, source: "BROCHURE" } })
    await expect(decideDeliverBeforePay(ctx, "r-1", { approve: true }, r as never)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("duyệt kèm hạn thu mới", async () => {
    const r = repo()
    r.findRequest.mockResolvedValue(pending)
    r.decide.mockResolvedValue(true)
    const now = new Date("2026-11-01T00:00:00Z")
    expect(await decideDeliverBeforePay(ctx, "r-1", { approve: true, collectDueAt: "2026-11-05T00:00:00Z" }, r as never, now)).toEqual({ status: "APPROVED" })
    expect(r.decide.mock.calls[0]?.[3]).toMatchObject({ approve: true, collectDueAt: new Date("2026-11-05T00:00:00Z") })
  })

  // Audit BL-15: hạn thu ở quá khứ làm đơn quá hạn ngay khi duyệt
  it("hạn thu ở quá khứ → 400, không ghi quyết định", async () => {
    const r = repo()
    r.findRequest.mockResolvedValue(pending)
    const now = new Date("2026-11-07T00:00:00Z")
    await expect(decideDeliverBeforePay(ctx, "r-1", { approve: true, collectDueAt: "2026-11-05T00:00:00Z" }, r as never, now)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(r.decide).not.toHaveBeenCalled()
  })
})
