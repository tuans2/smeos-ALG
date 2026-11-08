import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { planPayment, planRefund } from "@/modules/orders/workflow/standard-payment"

/**
 * WP-15 (audit BL-05, PO duyệt 07/11/2026): CHECK `orders_money_check` chỉ có khi CSDL dựng bằng `migrate deploy`
 * (production, CSDL chính của CI) — CSDL `_test` dựng bằng `db push` không có. Test này giữ migration và luật
 * thu/hoàn trong mã nói cùng một đẳng thức.
 */
const sql = readFileSync(join(process.cwd(), "prisma/migrations/20261108000000_orders_money_integrity/migration.sql"), "utf8")

describe("CHECK tiền của đơn", () => {
  it("migration khai đúng đẳng thức còn phải thu = tổng − đã thu và đã thu không âm", () => {
    expect(sql).toContain('CHECK ("paid_vnd" >= 0 AND "balance_vnd" = "total_vnd" - "paid_vnd")')
    expect(sql).toContain('VALIDATE CONSTRAINT "orders_money_check"')
  })

  it("thu và hoàn trong mã luôn cho ra số thoả CHECK", () => {
    const order = { totalVnd: 1_000_000, paidVnd: 300_000, status: "CONFIRMED" }
    const pay = planPayment(order, 200_000)
    const refund = planRefund(order, 300_000)
    for (const r of [pay, refund]) {
      if (typeof r === "string") throw new Error(r)
      expect(r.paidAfter).toBeGreaterThanOrEqual(0)
      expect(r.balanceAfter).toBe(order.totalVnd - r.paidAfter)
    }
  })
})
