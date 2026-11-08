import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as approveBypass } from "@/app/api/v1/coordinator/orders/[id]/approve-bypass/route"
import { POST as confirmDelivery } from "@/app/api/v1/coordinator/orders/[id]/confirm-delivery/route"
import { POST as chainDispatch } from "@/app/api/v1/greeting-card/orders/[id]/chain-dispatch/route"
import { POST as actOnSubcontract } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import { POST as submitShipper } from "@/app/api/v1/public/subcontract/[orderCode]/submit-shipper/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { SUBCONTRACT_TOKEN_HEADER, signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, seedChainBranch, withSession, type Tenant } from "../helpers/fixtures"
import { syncSubcontractShares } from "../helpers/subcontract-shares"

const CODE = "DH261022-0101"
const BRANCH = "CN1"

type OrderState = { status?: "CONFIRMED" | "CANCELLED"; production_status?: "ASSIGNED" | "READY"; delivery_status?: "PENDING" | "DELIVERING" }

async function seed(t: Tenant, dispatch: Record<string, unknown>, order: OrderState = {}, extra: Record<string, unknown> = {}) {
  await seedChainBranch(t, BRANCH, "Chi nhánh 1")
  const row = await prisma.orders.create({
    data: {
      organization_id: t.organizationId, code: CODE, source: "BROCHURE", status: order.status ?? "CONFIRMED",
      production_status: order.production_status ?? "ASSIGNED", delivery_status: order.delivery_status ?? "PENDING",
      total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
    },
  })
  await prisma.order_coordinations.create({
    data: {
      organization_id: t.organizationId,
      order_id: row.id,
      metadata: {
        subcontract_dispatch: {
          orderId: row.id, orderCode: CODE, currentRound: 1, claimedBranchName: "Chi nhánh 1", claimedAt: null,
          graceExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), declinedBranchIds: [], invitedBranchIds: [BRANCH],
          roundExpiresAt: null, ...dispatch,
        },
        ...extra,
      },
    },
  })
  await syncSubcontractShares(t.organizationId, row.id)
  return row.id
}

const params = <T>(v: T) => ({ params: Promise.resolve(v) })

function branchPost(path: string, handler: typeof actOnSubcontract, t: Tenant, body: Record<string, unknown>) {
  const req = new Request(`http://localhost/api/v1/public/subcontract/${CODE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", [SUBCONTRACT_TOKEN_HEADER]: signSubcontractBranchToken(t.organizationId, CODE, BRANCH) },
    body: JSON.stringify({ branchId: BRANCH, ...body }),
  })
  return handler(req, params({ orderCode: CODE }))
}

async function meta(orderId: string) {
  return (await prisma.order_coordinations.findFirstOrThrow({ where: { order_id: orderId } })).metadata as Record<string, Record<string, unknown>>
}

/**
 * Toàn vẹn trạng thái đơn gia công (rà soát cụm G, 22/10/2026): mọi bước ghi dưới khoá dòng và
 * chỉ khi đơn đang ở đúng bước. Trước đó: duyệt đúp trừ điểm 2 lần, đơn đã huỷ vẫn bị đưa sang
 * hoàn tất, "Gửi lại" xoá chi nhánh đang làm, bấm chốt lần nữa gửi lại tin cho khách.
 */
describe("toàn vẹn trạng thái đơn gia công", () => {
  let t: Tenant

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("alpha")
    await makeChainOrganization(t)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("duyệt bỏ qua bằng chứng hai lần cùng lúc: một lần thắng, chỉ trừ điểm một lần", async () => {
    const orderId = await seed(t, { dispatchStatus: "COMMITTED", claimedBranchId: BRANCH }, { production_status: "ASSIGNED" }, {
      bypass_requests: { QC: { status: "PENDING", requestedByBranchId: BRANCH, requestedByBranchName: "Chi nhánh 1", reason: "Máy ảnh hỏng" } },
    })
    const approve = () =>
      approveBypass(
        withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/approve-bypass`, t.token, {
          method: "POST",
          body: JSON.stringify({ step: "QC", decision: "APPROVE" }),
        }),
        params({ id: orderId })
      )
    const statuses = (await Promise.all([approve(), approve()])).map((r) => r.status).sort()
    expect(statuses).toEqual([200, 409])

    const branch = await prisma.branches.findFirstOrThrow({ where: { organization_id: t.organizationId, accepts_dispatch: true } })
    expect(branch.bypass_count).toBe(1)
    expect(branch.quality_score).toBe(88)
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(order.production_status).toBe("READY")
  })

  it("đơn đã huỷ: Điều phối không xác nhận giao được, chi nhánh không nhập shipper được", async () => {
    const orderId = await seed(t, { dispatchStatus: "COMMITTED", claimedBranchId: BRANCH }, { status: "CANCELLED", production_status: "READY" })
    const res = await confirmDelivery(
      withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/confirm-delivery`, t.token, {
        method: "POST",
        body: JSON.stringify({ confirmWithoutPhoto: true, reason: "Khách xác nhận đã nhận qua điện thoại" }),
      }),
      params({ id: orderId })
    )
    expect(res.status).toBe(409)
    const shipper = await branchPost("/submit-shipper", submitShipper, t, { shipperName: "Tài xế", shipperPhone: "0901234567" })
    expect(shipper.status).toBe(409)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
  })

  it("gửi lại lệnh điều phối khi đơn đã có chi nhánh chốt: 409, giữ chi nhánh đang làm", async () => {
    const orderId = await seed(t, { dispatchStatus: "COMMITTED", claimedBranchId: BRANCH })
    const res = await chainDispatch(
      withSession(`http://localhost/api/v1/greeting-card/orders/${orderId}/chain-dispatch`, t.token, {
        method: "POST",
        body: JSON.stringify({ approvedBranchIds: [BRANCH] }),
      }),
      params({ id: orderId })
    )
    expect(res.status).toBe(409)
    expect((await meta(orderId)).subcontract_dispatch?.claimedBranchId).toBe(BRANCH)
  })

  it("bấm chốt lần hai: không lỗi, không ghi lại mốc", async () => {
    const orderId = await seed(t, { dispatchStatus: "CLAIMED_GRACE", claimedBranchId: BRANCH })
    expect((await branchPost("", actOnSubcontract, t, { action: "COMMIT" })).status).toBe(200)
    const firstMark = ((await meta(orderId)).subcontract_dispatch?.remindersSent as Record<string, string>).M1_PREP
    const again = await branchPost("", actOnSubcontract, t, { action: "COMMIT" })
    expect(((await again.json()) as { data: { alreadyCommitted?: boolean } }).data.alreadyCommitted).toBe(true)
    expect(((await meta(orderId)).subcontract_dispatch?.remindersSent as Record<string, string>).M1_PREP).toBe(firstMark)
  })

  it("xoá ảnh QC: đúng một ảnh khớp nguyên khoá; sau khi ảnh đã duyệt thì không xoá được", async () => {
    const keys = [`org/${t.organizationId}/subcontract/x/qc-1.jpg`, `org/${t.organizationId}/subcontract/x/qc-2.jpg`]
    const orderId = await seed(t, { dispatchStatus: "COMMITTED", claimedBranchId: BRANCH }, {}, { qc_photos: keys })
    const joined = await branchPost("", actOnSubcontract, t, { action: "DELETE_QC", photoUrl: keys.join("") })
    expect(joined.status).toBe(200)
    expect((await meta(orderId)).qc_photos).toEqual(keys)

    expect((await branchPost("", actOnSubcontract, t, { action: "DELETE_QC", photoUrl: keys[0] })).status).toBe(200)
    expect((await meta(orderId)).qc_photos).toEqual([keys[1]])

    await prisma.orders.update({ where: { id: orderId }, data: { production_status: "READY" } })
    expect((await branchPost("", actOnSubcontract, t, { action: "DELETE_QC", photoUrl: keys[1] })).status).toBe(409)
  })
})
