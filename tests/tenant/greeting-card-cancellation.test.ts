import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { CancellationFollowUpRepository } from "@/modules/greeting-card/infra/cancellation-follow-up-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Đề xuất Hủy/Hoàn tiền Thẻ chào (08/10/2026): cách ly tổ chức + số hoàn do máy chủ tính. */
describe("đề xuất hủy / hoàn tiền Thẻ chào", () => {
  let a: Tenant
  let b: Tenant
  const repo = new CancellationRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function order(t: Tenant, paid: number, total = 500_000) {
    const id = randomUUID()
    await prisma.orders.create({
      data: {
        id, organization_id: t.organizationId, code: `DH-${id.slice(0, 6)}`, source: "BROCHURE", status: "CONFIRMED",
        total_vnd: total, paid_vnd: paid, balance_vnd: total - paid, created_by: t.userId,
      },
    })
    return id
  }

  it("tổ chức khác không đề xuất, không thấy, không duyệt được (404)", async () => {
    const orderId = await order(a, 300_000)
    await expect(repo.createProposal(b.ctx, {
      orderId, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 },
    })).rejects.toMatchObject({ code: "NOT_FOUND" })

    const { id } = await repo.createProposal(a.ctx, {
      orderId, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 },
    })
    expect(await repo.listPending(b.ctx)).toHaveLength(0)
    expect(await repo.getPendingType(b.ctx, id)).toBeNull()
    await expect(repo.decide(b.ctx, { requestId: id, approve: true, note: "" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    const after = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(after.status).toBe("CONFIRMED")
  })

  it("duyệt hoàn toàn phần chỉ huỷ đơn; hoàn tiền là bước riêng, đúng số đã thu, chỉ một lần (PO 15/10/2026)", async () => {
    const orderId = await order(a, 300_000)
    const { id } = await repo.createProposal(a.ctx, {
      orderId, senderRole: "COORDINATOR", proposal: { type: "FULL_REFUND", reason: "Hết hoa", refundAmountVnd: 0 },
    })
    expect(await repo.getPendingType(a.ctx, id)).toBe("FULL_REFUND")

    const res = await repo.decide(a.ctx, { requestId: id, approve: true, note: "", actualRefundVnd: 1 })
    expect(res).toMatchObject({ status: "APPROVED", orderStatus: "CANCELLED", refundVnd: 300_000 })
    // Duyệt không chuyển tiền: sổ thu chưa đổi, việc "Cần hoàn tiền" chờ Điều hành
    const approved = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(approved.paid_vnd)).toBe(300_000)
    expect(approved.status).toBe("CANCELLED")
    expect(await prisma.order_payments.count({ where: { order_id: orderId, kind: "REFUND" } })).toBe(0)
    const followUps = new CancellationFollowUpRepository()
    expect((await followUps.listPending(a.ctx)).map((r) => r.payload.followUp?.refundDueVnd)).toEqual([300_000])
    expect(await followUps.listPending(b.ctx)).toHaveLength(0)

    await followUps.complete(a.ctx, id, "Đã chuyển khoản trả khách")
    const after = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(after.paid_vnd)).toBe(0)
    const refunds = await prisma.order_payments.findMany({ where: { order_id: orderId, kind: "REFUND" } })
    expect(refunds.map((r) => Number(r.amount_vnd))).toEqual([300_000])

    await expect(repo.decide(a.ctx, { requestId: id, approve: true, note: "" })).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(followUps.complete(a.ctx, id, "")).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("hoa đã cắm xong, chưa giao: đề xuất huỷ được và Điều hành duyệt được (PO 15/10/2026)", async () => {
    const orderId = await order(a, 0)
    await prisma.orders.update({ where: { id: orderId }, data: { production_status: "READY" } })
    const { id } = await repo.createProposal(a.ctx, { orderId, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 } })
    await repo.decide(a.ctx, { requestId: id, approve: true, note: "" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
  })

  it("huỷ đơn đang giao: hệ thống không tự duyệt khi quá hạn (cần người duyệt)", async () => {
    const orderId = await order(a, 0)
    await prisma.orders.update({ where: { id: orderId }, data: { delivery_status: "DELIVERING" } })
    const { id } = await repo.createProposal(a.ctx, { orderId, senderRole: "COORDINATOR", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 } })
    await expect(repo.decide(a.ctx, { requestId: id, approve: true, note: "", autoTimeoutMinutes: 15 })).rejects.toMatchObject({ code: "CONFLICT" })
    expect((await repo.getPendingInfo(a.ctx, id))?.deliveryStatus).toBe("DELIVERING")
    await repo.decide(a.ctx, { requestId: id, approve: true, note: "Điều phối đã gọi shipper quay về" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
  })

  it("hủy đơn không hoàn không ghi sổ thu dù client gửi số hoàn", async () => {
    const orderId = await order(a, 200_000)
    const { id } = await repo.createProposal(a.ctx, {
      orderId, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Trùng đơn", refundAmountVnd: 0 },
    })
    const res = await repo.decide(a.ctx, { requestId: id, approve: true, note: "", actualRefundVnd: 200_000 })
    expect(res.refundVnd).toBe(0)
    expect(await prisma.order_payments.count({ where: { order_id: orderId } })).toBe(0)
  })

  it("đơn đã giao xong: không duyệt huỷ được (409), đề xuất vẫn chờ; huỷ được thì trả lại mã giảm giá (Đợt 2-I)", async () => {
    const delivered = await order(a, 500_000)
    await prisma.orders.update({ where: { id: delivered }, data: { delivery_status: "DELIVERED", status: "COMPLETED" } })
    const p1 = await repo.createProposal(a.ctx, { orderId: delivered, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 } })
    await expect(repo.decide(a.ctx, { requestId: p1.id, approve: true, note: "" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: delivered } })).status).toBe("COMPLETED")
    expect(await repo.listPending(a.ctx)).toHaveLength(1)

    const open = await order(a, 0)
    const v = await prisma.vouchers.create({ data: { organization_id: a.organizationId, code: "GIAM", discount_value: 10, is_used: true, order_id: open } })
    const p2 = await repo.createProposal(a.ctx, { orderId: open, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách huỷ", refundAmountVnd: 0 } })
    await repo.decide(a.ctx, { requestId: p2.id, approve: true, note: "" })
    expect((await prisma.vouchers.findUniqueOrThrow({ where: { id: v.id } }))).toMatchObject({ is_used: false, order_id: null })
  })

  it("hai khoản hoàn cùng lúc trên một đơn: không ghi đè số đã thu, tổng hoàn không vượt số đã thu", async () => {
    const orderId = await order(a, 300_000)
    const p1 = await repo.createProposal(a.ctx, { orderId, senderRole: "SALE", proposal: { type: "PARTIAL_REFUND", reason: "Hoa dập", refundAmountVnd: 200_000 } })
    const p2 = await repo.createProposal(a.ctx, { orderId, senderRole: "SALE", proposal: { type: "PARTIAL_REFUND", reason: "Giao trễ", refundAmountVnd: 200_000 } })
    await repo.decide(a.ctx, { requestId: p1.id, approve: true, note: "" })
    await repo.decide(a.ctx, { requestId: p2.id, approve: true, note: "" })
    const followUps = new CancellationFollowUpRepository()
    const results = await Promise.allSettled([followUps.complete(a.ctx, p1.id, ""), followUps.complete(a.ctx, p2.id, "")])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const after = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(after.paid_vnd)).toBe(100_000)
    const refunds = await prisma.order_payments.findMany({ where: { order_id: orderId, kind: "REFUND" } })
    expect(refunds.reduce((sum, r) => sum + Number(r.amount_vnd), 0)).toBe(200_000)
  })
})
