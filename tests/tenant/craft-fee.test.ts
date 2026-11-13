import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as confirmDelivery } from "@/app/api/v1/coordinator/orders/[id]/confirm-delivery/route"
import { POST as complain } from "@/app/api/v1/coordinator/orders/[id]/craft-fee-complaint/route"
import { POST as chainDispatch } from "@/app/api/v1/greeting-card/orders/[id]/chain-dispatch/route"
import { GET as craftFee } from "@/app/api/v1/greeting-card/orders/[id]/craft-fee/route"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, seedChainBranch, withSession, type Tenant } from "../helpers/fixtures"

const BRANCH = "CN1"
const params = <T>(v: T) => ({ params: Promise.resolve(v) })

async function seedOrder(t: Tenant, dispatch: Record<string, unknown> | null = null) {
  await seedChainBranch(t, BRANCH, "Chi nhánh 1")
  const order = await prisma.orders.create({
    data: {
      organization_id: t.organizationId, code: "DH261022-0201", source: "BROCHURE", status: "CONFIRMED",
      production_status: "READY", delivery_status: "DELIVERING",
      total_vnd: 1_130_000, vat_amount_vnd: 100_000, paid_vnd: 1_130_000, balance_vnd: 0, created_by: "test",
      pricing_rule_ref: { subtotalVnd: 1_000_000, discountVnd: 0, shippingFeeVnd: 30_000, quantity: 1 },
      // Hẹn giao 08:00–09:00 ngày 01/01/2026 — mọi lần giao trong test đều trễ
      delivery_window: { date: "2026-01-01", timeSlot: "08:00 - 09:00" },
    },
  })
  if (dispatch) {
    await prisma.order_coordinations.create({
      data: { organization_id: t.organizationId, order_id: order.id, metadata: { subcontract_dispatch: { orderId: order.id, orderCode: order.code, ...dispatch } } },
    })
  }
  return order.id
}

/** Tiệm đã tắt yêu cầu ảnh giao (PO 04/11/2026, ALG 4.18) — để Điều phối xác nhận giao không ảnh. */
const NO_DELIVERY_PHOTO = { brochure_workflow_policy: { preset: "CUSTOM", require_delivery_proof_photo: false } }

async function setPolicy(t: Tenant, policy: Record<string, string | number>) {
  await prisma.organizations.update({ where: { id: t.organizationId }, data: { settings: { industry: "FLORAL", craft_fee_policy: policy, ...NO_DELIVERY_PHOTO } } })
}

async function dispatchState(orderId: string) {
  const row = await prisma.order_coordinations.findFirstOrThrow({ where: { order_id: orderId } })
  return (row.metadata as { subcontract_dispatch: Record<string, unknown> & { craftFee?: { finalVnd: number; deductions: Array<{ kind: string; amountVnd: number }> } } }).subcontract_dispatch
}

const committed = { dispatchStatus: "COMMITTED", claimedBranchId: BRANCH, claimedBranchName: "Chi nhánh 1", subcontractPriceVnd: 500_000, declinedBranchIds: [], invitedBranchIds: [BRANCH] }

/** Phí gia công theo phương án tiệm cài, khấu trừ giao trễ / khiếu nại — PO 22/10/2026. */
describe("phí gia công của đơn điều phối chuỗi", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await makeChainOrganization(a)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("gợi ý 50% giá hàng trước VAT; tổ chức khác xem đơn → 404", async () => {
    const orderId = await seedOrder(a)
    const res = await craftFee(withSession(`http://localhost/api/v1/greeting-card/orders/${orderId}/craft-fee`, a.token), params({ id: orderId }))
    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({ suggestedVnd: 500_000, feeLabel: "Phí cắm hoa" })
    const foreign = await craftFee(withSession(`http://localhost/api/v1/greeting-card/orders/${orderId}/craft-fee`, b.token), params({ id: orderId }))
    expect(foreign.status).toBe(404)
  })

  it("mời chi nhánh: chốt phí theo phương án tiệm cài và lưu diễn giải vào đơn", async () => {
    await setPolicy(a, { method: "TIERED" })
    const orderId = await seedOrder(a)
    const res = await chainDispatch(
      withSession(`http://localhost/api/v1/greeting-card/orders/${orderId}/chain-dispatch`, a.token, { method: "POST", body: JSON.stringify({ approved_branch_ids: [BRANCH] }) }),
      params({ id: orderId })
    )
    expect(res.status).toBe(200)
    const state = await dispatchState(orderId)
    expect(state.subcontractPriceVnd).toBe(550_000)
    expect(state.craftFee).toMatchObject({ suggestedVnd: 550_000, finalVnd: 550_000, method: "TIERED", deductions: [] })
  })

  it("mặc định 0%: giao trễ và khiếu nại chỉ ghi nhận, không trừ phí", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { industry: "FLORAL", ...NO_DELIVERY_PHOTO } } })
    const orderId = await seedOrder(a, committed)
    const res = await confirmDelivery(
      withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/confirm-delivery`, a.token, {
        method: "POST",
        body: JSON.stringify({ confirm_without_photo: true, reason: "Khách xác nhận qua điện thoại" }),
      }),
      params({ id: orderId })
    )
    expect(res.status).toBe(200)
    const complaint = await complain(
      withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/craft-fee-complaint`, a.token, { method: "POST", body: JSON.stringify({ reason: "Hoa bị dập cánh" }) }),
      params({ id: orderId })
    )
    expect((await complaint.json()).data).toEqual({ deducted: false, payableVnd: 500_000 })
    expect((await dispatchState(orderId)).craftFee).toBeUndefined()
  })

  it("tiệm đặt 10% giao trễ, 20% khiếu nại: tự trừ, mỗi loại một lần; tổ chức khác không ghi được", async () => {
    await setPolicy(a, { lateDeliveryDeductionPercent: 10, complaintDeductionPercent: 20 })
    const orderId = await seedOrder(a, committed)
    await confirmDelivery(
      withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/confirm-delivery`, a.token, {
        method: "POST",
        body: JSON.stringify({ confirm_without_photo: true, reason: "Khách xác nhận qua điện thoại" }),
      }),
      params({ id: orderId })
    )
    const send = (t: Tenant) =>
      complain(
        withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/craft-fee-complaint`, t.token, { method: "POST", body: JSON.stringify({ reason: "Hoa bị dập cánh" }) }),
        params({ id: orderId })
      )
    expect((await (await send(a)).json()).data).toEqual({ deducted: true, payableVnd: 350_000 })
    expect((await (await send(a)).json()).data).toEqual({ deducted: false, payableVnd: 350_000 })
    expect((await send(b)).status).toBe(404)

    const fee = (await dispatchState(orderId)).craftFee
    expect(fee?.deductions.map((d) => [d.kind, d.amountVnd])).toEqual([["LATE_DELIVERY", 50_000], ["COMPLAINT", 100_000]])
  })
})
