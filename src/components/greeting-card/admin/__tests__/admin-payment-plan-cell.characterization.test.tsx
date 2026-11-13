import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { AdminPaymentPlanCell } from "../admin-payment-plan-cell"
import type { AdminOrder } from "../admin-order-types"

// Khoá hành vi (B5) trước khi chuyển <details> tự viết sang Disclosure.
const order = {
  id: "o1", code: "A1", status: "CONFIRMED", delivery_status: "PENDING", production_status: "",
  total_vnd: 500000, paid_vnd: 200000, balance_vnd: 300000, customer: null,
  greeting_sessions: [], created_at: "2026-11-01T00:00:00Z",
  payments: [{ id: "p1", kind: "DEPOSIT", amount_vnd: 200000, collected_at: "2026-11-01T03:00:00Z", reference: null }],
} as AdminOrder

describe("Ô thanh toán trong bảng đơn — hành vi hiện có", () => {
  it("hiện đã thu, còn lại; chi tiết đóng sẵn nhưng vẫn nằm trong trang", () => {
    const html = renderToStaticMarkup(<AdminPaymentPlanCell order={order} shopDepositPercent={40} />)
    expect(html).toContain("còn ")
    expect(html).toContain("Cách thu")
    expect(html).toContain("Lịch sử thu")
    expect(html).toContain("Thu cọc")
    expect(html).not.toMatch(/<details[^>]*open/)
  })

  it("đơn chưa thu lần nào → báo chưa có lần thu", () => {
    const html = renderToStaticMarkup(<AdminPaymentPlanCell order={{ ...order, paid_vnd: 0, payments: [] }} shopDepositPercent={40} />)
    expect(html).toContain("Chưa có lần thu nào")
  })
})
