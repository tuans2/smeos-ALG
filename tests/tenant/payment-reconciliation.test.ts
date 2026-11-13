import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { reconcileOrderPayments } from "@/modules/orders/use-cases/reconcile-order-payments"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Đối soát `orders.paid_vnd` với `order_payments` (ADR-013 D-I6, bước I-3). Bảng
 * `reconciliation_findings` mang `organization_id` của đơn lệch — không lẫn tổ chức.
 */
describe("đối soát số đã thu", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function order(t: Tenant, code: string, paid: number) {
    return prisma.orders.create({
      data: { organization_id: t.organizationId, code, created_by: t.userId, total_vnd: 200_000, paid_vnd: paid, balance_vnd: 200_000 - paid },
    })
  }

  async function pay(t: Tenant, orderId: string, amount: number, kind: "DEPOSIT" | "BALANCE" | "REFUND", status = "CONFIRMED") {
    await prisma.order_payments.create({
      data: { organization_id: t.organizationId, order_id: orderId, kind, amount_vnd: amount, payment_method: "BANK_TRANSFER", collected_by: t.userId, status },
    })
  }

  it("đơn khớp sổ thu (gồm hoàn tiền, bỏ khoản chờ xác nhận) không bị ghi nhận", async () => {
    const o = await order(a, "DH-1", 70_000)
    await pay(a, o.id, 100_000, "DEPOSIT")
    await pay(a, o.id, 30_000, "REFUND")
    await pay(a, o.id, 50_000, "BALANCE", "PENDING")
    expect(await reconcileOrderPayments()).toEqual({ mismatched: 0, resolved: 0 })
  })

  it("đơn lệch được ghi đúng tổ chức; sửa xong lượt sau đóng dòng", async () => {
    const lech = await order(b, "DH-2", 50_000)
    await order(a, "DH-3", 0)
    expect(await reconcileOrderPayments()).toEqual({ mismatched: 1, resolved: 0 })
    const finding = await prisma.reconciliation_findings.findFirstOrThrow({ where: { entity_id: lech.id } })
    expect(finding).toMatchObject({ organization_id: b.organizationId, resolved_at: null })
    expect(Number(finding.expected_vnd)).toBe(0)
    expect(Number(finding.actual_vnd)).toBe(50_000)

    await pay(b, lech.id, 50_000, "DEPOSIT")
    expect(await reconcileOrderPayments()).toEqual({ mismatched: 0, resolved: 1 })
    expect((await prisma.reconciliation_findings.findFirstOrThrow({ where: { entity_id: lech.id } })).resolved_at).not.toBeNull()
  })
})
