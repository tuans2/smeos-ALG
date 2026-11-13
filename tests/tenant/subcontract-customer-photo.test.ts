import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as approveCustomerPhoto } from "@/app/api/v1/coordinator/orders/[id]/approve-customer-photo/route"
import { POST as submitShipper } from "@/app/api/v1/public/subcontract/[orderCode]/submit-shipper/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { Prisma } from "@/generated/prisma/client"
import {
  BROCHURE_WORKFLOW_POLICY_KEY,
  STANDARD_WORKFLOW_POLICY,
  serializeWorkflowPolicy,
  type CustomerApprovalMode,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { SUBCONTRACT_TOKEN_HEADER, signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, seedChainBranch, withSession, type Tenant } from "../helpers/fixtures"
import { syncSubcontractShares } from "../helpers/subcontract-shares"

const CODE = "DH261022-0401"
const BRANCH = "CN1"
const params = <T>(v: T) => ({ params: Promise.resolve(v) })

async function setApprovalMode(t: Tenant, mode: CustomerApprovalMode) {
  const policy = { ...STANDARD_WORKFLOW_POLICY, customerApprovalMode: mode, preset: "CUSTOM" as const }
  await prisma.organizations.update({
    where: { id: t.organizationId },
    data: { settings: { [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(policy) } as Prisma.InputJsonValue },
  })
}

/** Đơn đã có chi nhánh chốt, đang chờ ảnh thành phẩm; trả id đơn. */
async function seedOrder(t: Tenant) {
  await seedChainBranch(t, BRANCH, "Chi nhánh 1")
  const order = await prisma.orders.create({
    data: {
      organization_id: t.organizationId, code: CODE, source: "BROCHURE", status: "CONFIRMED",
      production_status: "ASSIGNED", delivery_status: "PENDING",
      total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
    },
  })
  await prisma.order_coordinations.create({
    data: {
      organization_id: t.organizationId,
      order_id: order.id,
      metadata: { subcontract_dispatch: { orderId: order.id, orderCode: CODE, dispatchStatus: "COMMITTED", claimedBranchId: BRANCH, claimedBranchName: "Chi nhánh 1" } },
    },
  })
  await syncSubcontractShares(t.organizationId, order.id)
  return order.id
}

/** Bước ảnh QC đạt — như route tải ảnh của chi nhánh, không qua kho ảnh/AI. */
async function passQc(t: Tenant, orderId: string, keys: string[]) {
  return new SubcontractStepStore().applyStep({
    organizationId: t.organizationId,
    orderId,
    order: { production_status: "READY" },
    metadata: (current) => ({ ...current, qc_photos: keys }),
    recordProductPhoto: { createdBy: `branch_${BRANCH}` },
  })
}

function shipper(t: Tenant) {
  return submitShipper(
    new Request(`http://localhost/api/v1/public/subcontract/${CODE}/submit-shipper`, {
      method: "POST",
      headers: { "content-type": "application/json", [SUBCONTRACT_TOKEN_HEADER]: signSubcontractBranchToken(t.organizationId, CODE, BRANCH) },
      body: JSON.stringify({ branchId: BRANCH, shipperName: "Tài xế", shipperPhone: "0901234567" }),
    }),
    params({ orderCode: CODE })
  )
}

/**
 * Khách duyệt ảnh thành phẩm của đơn gia công chuỗi — cùng luật với đơn 1 cửa hàng (PO 22/10/2026).
 * Trước đó ảnh chi nhánh không tới khách, mốc chờ lấy nhầm số phút nhắc QC, chi nhánh nhập shipper ngay.
 */
describe("khách duyệt ảnh đơn gia công chuỗi", () => {
  let t: Tenant

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("alpha")
    await makeChainOrganization(t)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("ảnh QC đạt thành ảnh thành phẩm của đơn (chỉ khoá trong kho của tổ chức)", async () => {
    const orderId = await seedOrder(t)
    const own = `org/${t.organizationId}/subcontract/${orderId}/qc-1.jpg`
    expect(await passQc(t, orderId, [own, "org/to-chuc-khac/qc-2.jpg"])).toBe(true)

    const records = await prisma.order_qc_records.findMany({ where: { order_id: orderId } })
    expect(records.map((r) => r.notes)).toEqual(["PRODUCT_PHOTO_UPLOADED"])
    const assetIds = records[0]?.image_asset_ids as string[]
    const assets = await prisma.assets.findMany({ where: { id: { in: assetIds } } })
    expect(assets.map((a) => [a.organization_id, a.storage_key, a.mime_type])).toEqual([[t.organizationId, own, "image/jpeg"]])
  })

  it("bắt buộc khách duyệt: chi nhánh chưa nhập shipper được; Điều phối duyệt thay thì mở", async () => {
    await setApprovalMode(t, "REQUIRE_CUSTOMER")
    const orderId = await seedOrder(t)
    await passQc(t, orderId, [`org/${t.organizationId}/subcontract/${orderId}/qc-1.jpg`])

    const blocked = await shipper(t)
    expect(blocked.status).toBe(409)
    expect(JSON.stringify(await blocked.json())).toMatch(/chờ khách duyệt ảnh/)

    const approve = () =>
      approveCustomerPhoto(withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/approve-customer-photo`, t.token, { method: "POST" }), params({ id: orderId }))
    expect((await (await approve()).json()).data.alreadyApproved).toBe(false)
    expect((await (await approve()).json()).data.alreadyApproved).toBe(true)
    expect(await prisma.order_qc_records.count({ where: { order_id: orderId, notes: "CUSTOMER_PHOTO_APPROVED" } })).toBe(1)

    expect((await shipper(t)).status).toBe(200)
  })

  it("chế độ bỏ qua: không chờ khách; chưa có ảnh thì Điều phối không duyệt thay được", async () => {
    await setApprovalMode(t, "BYPASS")
    const orderId = await seedOrder(t)
    const early = await approveCustomerPhoto(
      withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/approve-customer-photo`, t.token, { method: "POST" }),
      params({ id: orderId })
    )
    expect(early.status).toBe(409)
    await passQc(t, orderId, [`org/${t.organizationId}/subcontract/${orderId}/qc-1.jpg`])
    expect((await shipper(t)).status).toBe(200)
  })
})
