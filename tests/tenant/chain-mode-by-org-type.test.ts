import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as bulkImport } from "@/app/api/v1/greeting-card/chain-branches/bulk-import/route"
import { GET as rankBranches, POST as chainDispatch } from "@/app/api/v1/greeting-card/orders/[id]/chain-dispatch/route"
import { PATCH as patchOrganization } from "@/app/api/v1/organizations/current/route"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import {
  STANDARD_WORKFLOW_POLICY,
  STRICT_WORKFLOW_POLICY,
  parseBrochureWorkflowPolicy,
  serializeWorkflowPolicy,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

const params = <T>(v: T) => ({ params: Promise.resolve(v) })

async function seedOrder(t: Tenant) {
  const order = await prisma.orders.create({
    data: {
      organization_id: t.organizationId, code: "DH261022-0301", source: "BROCHURE", status: "CONFIRMED",
      total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
    },
  })
  return order.id
}

async function workflowOf(t: Tenant) {
  const shop = await new GreetingCardRepository().getShopProfile(t.organizationId)
  return parseBrochureWorkflowPolicy(shop.settings, shop.type)
}

/**
 * Chuỗi / 1 cửa hàng theo loại tổ chức Admin SaaS duyệt (PO 22/10/2026). Trước đó tiệm tự bật
 * công tắc "Điều phối nhận đơn" hoặc chọn gói Nghiêm ngặt là thành Chuỗi, và ngược lại.
 */
describe("chế độ Chuỗi theo loại tổ chức", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tổ chức 1 cửa hàng: không xếp hạng, không mời, không nhập chi nhánh (409)", async () => {
    const orderId = await seedOrder(a)
    const url = `http://localhost/api/v1/greeting-card/orders/${orderId}/chain-dispatch`
    expect((await rankBranches(withSession(url, a.token), params({ id: orderId }))).status).toBe(409)
    const post = await chainDispatch(withSession(url, a.token, { method: "POST", body: JSON.stringify({ approved_branch_ids: ["CN1"] }) }), params({ id: orderId }))
    expect(post.status).toBe(409)
    const imported = await bulkImport(
      withSession("http://localhost/api/v1/greeting-card/chain-branches/bulk-import", a.token, {
        method: "POST",
        body: JSON.stringify({ branches: [{ branchId: "CN1", branchName: "Quận 1" }] }),
      })
    )
    expect(imported.status).toBe(409)
    expect(await prisma.branches.count({ where: { organization_id: a.organizationId, accepts_dispatch: true } })).toBe(0)
  })

  it("tiệm tự bật công tắc hoặc chọn gói Nghiêm ngặt không đổi được mô hình; Admin SaaS duyệt thì đổi", async () => {
    const patch = (policy: Record<string, unknown>) =>
      patchOrganization(
        withSession("http://localhost/api/v1/organizations/current", a.token, {
          method: "PATCH",
          body: JSON.stringify({ settings: { brochure_workflow_policy: policy } }),
        })
      )
    expect((await patch(serializeWorkflowPolicy(STRICT_WORKFLOW_POLICY))).status).toBe(200)
    expect(await workflowOf(a)).toMatchObject({ preset: "STRICT", requireCoordinatorAcceptance: false })

    await makeChainOrganization(a)
    expect((await patch(serializeWorkflowPolicy(STANDARD_WORKFLOW_POLICY))).status).toBe(200)
    expect(await workflowOf(a)).toMatchObject({ preset: "STANDARD", requireCoordinatorAcceptance: true })
  })
})
