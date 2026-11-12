"use client"

import React from "react"
import { Disclosure } from "@/components/ui/disclosure"
import { orderPaymentSummary } from "@/modules/greeting-card/domain/payment-summary"
import { vnd, type AdminOrder } from "./admin-order-types"

const KIND_LABEL: Record<string, string> = { DEPOSIT: "Thu cọc", BALANCE: "Thu đủ", REFUND: "Hoàn tiền" }
const SOURCE_LABEL = { SHOP_DEFAULT: "Mặc định của tiệm", CAMPAIGN: "Theo đợt", PAYMENT_CODE: "Mã thanh toán" } as const

/**
 * Thanh toán của một đơn cho Điều hành/Sale: cách thu, mã thanh toán đã dùng, % cọc,
 * đã thu / còn lại, trạng thái và lịch sử các lần thu (mở rộng khi bấm).
 */
export function AdminPaymentPlanCell({ order, shopDepositPercent }: { order: AdminOrder; shopDepositPercent: number }) {
  const balance = Math.max(0, order.total_vnd - order.paid_vnd)
  const s = orderPaymentSummary(
    {
      totalVnd: order.total_vnd, paidVnd: order.paid_vnd, pricingRuleRef: order.pricing_rule_ref,
      status: order.status, productionStatus: order.production_status ?? "", deliveryStatus: order.delivery_status,
    },
    shopDepositPercent,
    { reported: order.greeting_sessions[0]?.status === "PAYMENT_REPORTED" },
  )
  return (
    <div className="text-right">
      <div className={balance > 0 ? "font-bold text-warning-text" : "font-bold text-success"}>{vnd(order.paid_vnd)}</div>
      {balance > 0 && order.status !== "CANCELLED" && <div className="text-caption text-text-muted">còn {vnd(balance)}</div>}
      <Disclosure
        label={`${s.policyLabel}${s.paymentCode ? ` · ${s.paymentCode}` : ""}`}
        className="mt-1 border-0 bg-transparent text-caption text-left"
      >
        <dl className="mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-2 min-w-52">
          <Line label="Cách thu" value={`${s.policyLabel} (${SOURCE_LABEL[s.source]}${s.campaignName ? `: ${s.campaignName}` : ""})`} />
          <Line label="Mã thanh toán" value={s.paymentCode ?? "Không dùng"} />
          <Line label="Tổng" value={vnd(s.totalVnd)} />
          <Line label="Đã thu" value={vnd(s.paidVnd)} />
          <Line label="Còn lại" value={vnd(s.remainingVnd)} />
          <Line label="Trạng thái" value={s.statusLabel} />
          {s.milestones.map((m) => (
            <Line key={m.seq} label={m.kind === "DEPOSIT" ? `Đợt ${m.seq}: cọc ${m.percent}%` : m.kind === "BALANCE" ? `Đợt ${m.seq}: còn lại` : "Một lần"} value={`${vnd(m.amountVnd)} · ${m.status === "PAID" ? "Đã thu" : m.status === "PARTIALLY_PAID" ? "Thu một phần" : "Chờ thu"}`} />
          ))}
          <dt className="mt-1 font-bold text-text">Lịch sử thu</dt>
          {order.payments.length === 0 ? (
            <dd className="text-text-muted">Chưa có lần thu nào</dd>
          ) : (
            order.payments.map((p) => (
              <dd key={p.id} className="flex justify-between gap-2">
                <span>{new Date(p.collected_at).toLocaleString("vi-VN")} · {KIND_LABEL[p.kind] ?? "Thu tiền"}</span>
                <span className="font-bold">{p.kind === "REFUND" ? "−" : ""}{vnd(p.amount_vnd)}</span>
              </dd>
            ))
          )}
        </dl>
      </Disclosure>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold text-text text-right">{value}</dd>
    </div>
  )
}
