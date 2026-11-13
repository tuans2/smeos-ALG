import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as sweep } from "@/app/api/v1/internal/chain-dispatch-sweep/route"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, seedChainBranch, type Tenant } from "../helpers/fixtures"

const run = async () => {
  const res = await sweep(new Request("http://localhost/api/v1/internal/chain-dispatch-sweep", { method: "POST", headers: { "x-cron-secret": "dev" } }))
  return ((await res.json()) as { data: { graceCommitted: number; errorCount: number } }).data
}

/**
 * Hết thời gian huỷ nhận mà chi nhánh không huỷ → sweep tự chốt (PO 22/10/2026 "bật cả hai").
 * Trước đó logic tự chốt nằm trong bộ lập lịch không được gọi — đơn kẹt ở CLAIMED_GRACE.
 */
describe("sweep tự chốt khi hết hạn huỷ nhận", () => {
  let t: Tenant

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("alpha")
    await makeChainOrganization(t)
    await seedChainBranch(t, "CN1", "Chi nhánh 1")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function seed(code: string, graceExpiresAt: Date) {
    const order = await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code, source: "BROCHURE", status: "CONFIRMED", production_status: "WAITING",
        total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
        delivery_window: { date: "2027-01-10", timeSlot: "Trước 12h" },
      },
    })
    await prisma.order_coordinations.create({
      data: {
        organization_id: t.organizationId, order_id: order.id,
        metadata: { subcontract_dispatch: { orderId: order.id, orderCode: code, dispatchStatus: "CLAIMED_GRACE", currentRound: 1, claimedBranchId: "CN1", claimedBranchName: "Chi nhánh 1", claimedAt: new Date().toISOString(), graceExpiresAt: graceExpiresAt.toISOString(), declinedBranchIds: [], invitedBranchIds: ["CN1"], roundExpiresAt: null } },
      },
    })
    return order.id
  }

  const statusOf = async (orderId: string) =>
    ((await prisma.order_coordinations.findFirstOrThrow({ where: { order_id: orderId } })).metadata as { subcontract_dispatch: { dispatchStatus: string } }).subcontract_dispatch.dispatchStatus

  it("chốt đơn đã hết hạn, giữ đơn còn hạn; chạy lại không chốt lần hai", async () => {
    const expired = await seed("DH-G1", new Date(Date.now() - 60_000))
    const pending = await seed("DH-G2", new Date(Date.now() + 10 * 60_000))

    const first = await run()
    expect(first.graceCommitted).toBe(1)
    expect(await statusOf(expired)).toBe("COMMITTED")
    expect(await statusOf(pending)).toBe("CLAIMED_GRACE")
    // Chi nhánh chốt → đơn vào sản xuất (tự xác nhận khi chi nhánh chốt, mặc định bật)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: expired } })).production_status).toBe("ASSIGNED")

    expect((await run()).graceCommitted).toBe(0)
  })
})
