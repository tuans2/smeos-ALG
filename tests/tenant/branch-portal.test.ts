import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as portalOrders } from "@/app/api/v1/branch-portal/orders/route"
import { PUT as setChainBranch } from "@/app/api/v1/members/[id]/chain-branch/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

async function addBranches(t: Tenant, codes: string[]) {
  await new ChainBranchRepository().upsertMany(
    t.organizationId,
    codes.map((code) => ({ branchId: code, branchName: `CN ${code}`, qualityScore: 90, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true }))
  )
}

async function dispatchedOrder(t: Tenant, code: string, state: Record<string, unknown>) {
  const order = await prisma.orders.create({
    data: {
      organization_id: t.organizationId, code, source: "BROCHURE", status: "CONFIRMED",
      total_vnd: 1, paid_vnd: 1, balance_vnd: 0, created_by: "test", delivery_address: { street: `Địa chỉ ${code}` },
    },
  })
  await prisma.order_coordinations.create({
    data: {
      organization_id: t.organizationId, order_id: order.id,
      metadata: {
        subcontract_dispatch: {
          orderId: order.id, orderCode: code, dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null,
          claimedAt: null, graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: [],
          roundExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), ...state,
        },
      },
    },
  })
}

async function ownMembershipId(t: Tenant): Promise<string> {
  const m = await prisma.memberships.findFirstOrThrow({ where: { organization_id: t.organizationId, user_id: t.userId } })
  return m.id
}

function assign(t: Tenant, membershipId: string, code: string | null) {
  const req = withSession(`http://localhost/api/v1/members/${membershipId}/chain-branch`, t.token, {
    method: "PUT", body: JSON.stringify({ chain_branch_code: code }),
  })
  return setChainBranch(req, { params: Promise.resolve({ id: membershipId }) })
}

async function listCodes(t: Tenant): Promise<string[]> {
  const res = await portalOrders(withSession("http://localhost/api/v1/branch-portal/orders", t.token))
  expect(res.status).toBe(200)
  const data = (await readJson(res)).data as { orders: Array<{ orderCode: string }> }
  return data.orders.map((o) => o.orderCode).sort()
}

/** Trang cửa hàng nhận gia công (PO 22/10/2026): chỉ thấy đơn của chi nhánh gắn với tài khoản. */
describe("trang cửa hàng nhận gia công", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await addBranches(a, ["Q1", "Q2"])
    await addBranches(b, ["Q1"])
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chưa gắn chi nhánh: không thấy đơn nào", async () => {
    await dispatchedOrder(a, "DH-A1", { invitedBranchIds: ["Q1"] })
    expect(await listCodes(a)).toEqual([])
  })

  it("gắn Q1: thấy lời mời và đơn đang làm của Q1; không thấy đơn của Q2 hay của tổ chức khác trùng mã chi nhánh", async () => {
    expect((await assign(a, await ownMembershipId(a), "Q1")).status).toBe(200)

    await dispatchedOrder(a, "DH-A1", { invitedBranchIds: ["Q1", "Q2"] })
    await dispatchedOrder(a, "DH-A2", { dispatchStatus: "COMMITTED", claimedBranchId: "Q1" })
    await dispatchedOrder(a, "DH-A3", { invitedBranchIds: ["Q2"] })
    await dispatchedOrder(a, "DH-A4", { dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "Q2", invitedBranchIds: ["Q1", "Q2"] })
    await dispatchedOrder(a, "DH-A5", { invitedBranchIds: ["Q1"], declinedBranchIds: ["Q1"] })
    await dispatchedOrder(b, "DH-B1", { invitedBranchIds: ["Q1"] })

    expect(await listCodes(a)).toEqual(["DH-A1", "DH-A2"])
  })

  it("gắn chi nhánh không thuộc tổ chức, hoặc thành viên của tổ chức khác: 404", async () => {
    const membershipA = await ownMembershipId(a)
    expect((await assign(a, membershipA, "KHONG-CO")).status).toBe(404)
    expect((await assign(b, membershipA, "Q1")).status).toBe(404)
    const stored = await prisma.memberships.findUniqueOrThrow({ where: { id: membershipA } })
    expect(stored.branch_id).toBeNull()
  })
})
