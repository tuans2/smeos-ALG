import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as actOnSubcontract } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { syncSubcontractShares } from "../helpers/subcontract-shares"

const CODE = "DH261022-0001"

async function seed(t: Tenant, invited: string[], branchCodes: string[]) {
  const branches = await Promise.all(
    branchCodes.map((code) =>
      prisma.branches.create({ data: { organization_id: t.organizationId, name: `Chi nhánh ${code}`, code } })
    )
  )
  const ids = branches.map((b) => b.id)
  const order = await prisma.orders.create({
    data: {
      organization_id: t.organizationId, code: CODE, source: "BROCHURE", status: "CONFIRMED",
      total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
    },
  })
  await prisma.order_coordinations.create({
    data: {
      organization_id: t.organizationId,
      order_id: order.id,
      metadata: {
        subcontract_dispatch: {
          orderId: order.id, orderCode: CODE, dispatchStatus: "OPEN", currentRound: 1,
          claimedBranchId: null, claimedAt: null, graceExpiresAt: null, declinedBranchIds: [],
          invitedBranchIds: invited.map((i) => ids[Number(i)]!), roundExpiresAt: null,
        },
      },
    },
  })
  await syncSubcontractShares(t.organizationId, order.id)
  return { ids, orderId: order.id }
}

function claim(t: Tenant, branchId: string): Promise<Response> {
  const token = signSubcontractBranchToken(t.organizationId, CODE, branchId)
  const req = new Request(`http://localhost/api/v1/public/subcontract/${CODE}?t=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "CLAIM", branchId }),
  })
  return actOnSubcontract(req, { params: Promise.resolve({ orderCode: CODE }) })
}

async function dispatchState(orderId: string) {
  const coord = await prisma.order_coordinations.findFirst({ where: { order_id: orderId } })
  return (coord?.metadata as Record<string, Record<string, unknown>>).subcontract_dispatch
}

/** Rà soát 22/10/2026: hai chi nhánh bấm nhận cùng lúc từng cùng "thắng"; chi nhánh ngoài lời mời từng nhận được. */
describe("chi nhánh bấm nhận Thẻ Gia Công", () => {
  let t: Tenant

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hai chi nhánh được mời bấm nhận cùng lúc: đúng một chi nhánh thắng", async () => {
    const { ids, orderId } = await seed(t, ["0", "1"], ["CN-1", "CN-2"])
    const res = await Promise.all(ids.map((id) => claim(t, id)))
    const statuses = res.map((r) => r.status).sort()
    expect(statuses).toEqual([200, 409])

    const state = await dispatchState(orderId)
    expect(state?.dispatchStatus).toBe("CLAIMED_GRACE")
    const winner = ids[res.findIndex((r) => r.status === 200)]
    expect(state?.claimedBranchId).toBe(winner)
  })

  it("chi nhánh không có trong lời mời vòng hiện tại: 404 (không có quyền xem đơn, P-4), đơn vẫn mở", async () => {
    const { ids, orderId } = await seed(t, ["0"], ["CN-1", "CN-2"])
    const res = await claim(t, ids[1]!)
    expect(res.status).toBe(404)
    expect((await dispatchState(orderId))?.dispatchStatus).toBe("OPEN")
  })

  it("ghi đệm toạ độ giao hàng chỉ thêm khoá delivery_geo, giữ nguyên trạng thái điều phối", async () => {
    const { orderId } = await seed(t, ["0"], ["CN-1"])
    const ctx = { organizationId: t.organizationId, workspaceId: "", userId: "u", branchId: null, capabilities: new Set<string>() }
    const repo = new SubcontractOrderRepository()
    await repo.saveDeliveryGeo(ctx, orderId, { addressKey: "1 lê lợi", location: { latitude: 10.7, longitude: 106.7 }, resolvedAt: "2026-10-22T00:00:00Z" })

    expect((await dispatchState(orderId))?.dispatchStatus).toBe("OPEN")
    expect((await repo.loadDeliveryGeo(ctx, orderId))?.location).toEqual({ latitude: 10.7, longitude: 106.7 })
  })
})
