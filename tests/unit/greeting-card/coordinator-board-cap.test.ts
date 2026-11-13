import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"

const ctx: TenantContext = { organizationId: "org-a", workspaceId: "", userId: "u1", branchId: null, capabilities: new Set(["R1", "R4"]) }
const light = [
  { id: "cu-giao-xa", delivery_window: { date: "2026-10-30", timeSlot: "08:00 - 10:00" }, created_at: new Date("2026-10-01T00:00:00Z") },
  { id: "moi-giao-som", delivery_window: { date: "2026-10-17", timeSlot: "08:00 - 10:00" }, created_at: new Date("2026-10-16T00:00:00Z") },
  { id: "moi-giao-chieu", delivery_window: { date: "2026-10-17", timeSlot: "14:00 - 16:00" }, created_at: new Date("2026-10-16T01:00:00Z") },
]

function fakeDb(total: number) {
  const findMany = vi.fn(async (args: { select?: unknown; where: { id?: { in: string[] } } }) =>
    args.select ? light : (args.where.id?.in ?? light.map((o) => o.id)).map((id) => ({
      id, total_vnd: 0, paid_vnd: 0, balance_vnd: 0, items: [], greeting_sessions: [], events: [], qc_records: [], assignments: [], coordination: null,
    })))
  return { db: { orders: { count: vi.fn(async () => total), findMany }, memberships: { findMany: vi.fn(async () => []) } }, findMany }
}

/** Trần bảng Điều phối: trước đây giữ đơn tạo sớm nhất nên đơn mới sắp giao bị rơi khỏi bảng (16/10/2026). */
describe("bảng Điều phối vượt trần", () => {
  const opts = { doneSince: new Date(), max: 2 }

  it("giữ đơn có ngày + giờ giao gần nhất, không phải đơn tạo sớm nhất", async () => {
    const { db, findMany } = fakeDb(3)
    const rows = await new BrochureOrderRepository(db as never).listCoordinatorBoard(ctx, opts)
    expect(rows.map((r) => r.id).sort()).toEqual(["moi-giao-chieu", "moi-giao-som"])
    expect(findMany.mock.calls[1]![0]).toMatchObject({ where: { id: { in: ["moi-giao-som", "moi-giao-chieu"] }, organization_id: "org-a" } })
  })

  it("chưa vượt trần: một lần đọc như cũ, không đọc nhẹ thêm", async () => {
    const { db, findMany } = fakeDb(2)
    await new BrochureOrderRepository(db as never).listCoordinatorBoard(ctx, opts)
    expect(findMany).toHaveBeenCalledTimes(1)
  })
})
