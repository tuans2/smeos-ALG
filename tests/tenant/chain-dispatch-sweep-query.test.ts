import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import { ChainDispatchSweepQuery } from "@/modules/greeting-card/infra/chain-dispatch-sweep-query"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

type Seed = { status: string; orderStatus?: "CONFIRMED" | "COMPLETED" | "CANCELLED"; delivered?: boolean }

async function seed(t: Tenant, rows: Seed[]): Promise<void> {
  let n = 0
  for (const row of rows) {
    n++
    const order = await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code: `DH-${String(n).padStart(4, "0")}`, source: "BROCHURE",
        status: row.orderStatus ?? "CONFIRMED", total_vnd: 1, paid_vnd: 1, balance_vnd: 0, created_by: "test",
        ...(row.delivered ? { delivery_status: "DELIVERED" as const } : {}),
      },
    })
    await prisma.order_coordinations.create({
      data: {
        // id tăng dần theo thứ tự seed → đơn cần xử lý nằm SAU 50 dòng đầu (trước đây bị bỏ sót)
        id: `coord-${String(n).padStart(4, "0")}`,
        organization_id: t.organizationId,
        order_id: order.id,
        metadata: { subcontract_dispatch: { orderId: order.id, orderCode: order.code, dispatchStatus: row.status } },
      },
    })
  }
}

async function collectAll(q: ChainDispatchSweepQuery, pageSize: number): Promise<string[]> {
  const ids: string[] = []
  let after: string | null = null
  for (let i = 0; i < 100; i++) {
    const page = await q.listActiveDispatchPage(pageSize, after)
    if (page.length === 0) break
    ids.push(...page.map((p) => p.id))
    after = page[page.length - 1]!.id
  }
  return ids
}

/** Rà soát 22/10/2026: bộ quét chỉ lấy 50 dòng bất kỳ rồi mới lọc trạng thái → đơn cần nhắc bị bỏ sót. */
describe("bộ quét điều phối gia công — truy vấn", () => {
  let t: Tenant

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("lọc trong DB và duyệt hết theo trang: đơn cần xử lý sau 60 đơn đã xong vẫn được lấy", async () => {
    const done: Seed[] = [
      ...Array.from({ length: 30 }, () => ({ status: "COMMITTED", delivered: true })),
      ...Array.from({ length: 20 }, () => ({ status: "COMMITTED", orderStatus: "COMPLETED" as const })),
      ...Array.from({ length: 5 }, () => ({ status: "OPEN", orderStatus: "CANCELLED" as const })),
      ...Array.from({ length: 5 }, () => ({ status: "ESCALATED" })),
    ]
    const active: Seed[] = [{ status: "OPEN" }, { status: "CLAIMED_GRACE" }, { status: "COMMITTED" }]
    await seed(t, [...done, ...active])

    const ids = await collectAll(new ChainDispatchSweepQuery(), 2)
    expect(ids).toEqual(["coord-0061", "coord-0062", "coord-0063"])
  })

  it("hai lượt quét chồng nhau: chỉ một lượt giữ khoá, lượt kia bỏ qua", async () => {
    const q = new ChainDispatchSweepQuery()
    let release!: () => void
    const held = new Promise<void>((r) => { release = r })
    const first = q.withSweepLock(10_000, async () => { await held; return "first" })
    await new Promise((r) => setTimeout(r, 200))
    const second = await q.withSweepLock(10_000, async () => "second")
    release()
    expect(second).toBeNull()
    expect(await first).toBe("first")
    // Khoá tự nhả khi giao dịch kết thúc
    expect(await q.withSweepLock(10_000, async () => "again")).toBe("again")
  })
})
