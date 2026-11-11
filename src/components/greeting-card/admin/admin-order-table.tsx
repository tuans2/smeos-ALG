"use client"

import React from "react"
import { Ban, Check, ClipboardCheck, RotateCcw, Tag, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { paymentCheckOf } from "@/modules/greeting-card/domain/payment-check"
import { vnd, type AdminOrder, type OrderAction } from "./admin-order-types"
import { AdminPaymentPlanCell } from "./admin-payment-plan-cell"

import { readPaymentPlan } from "@/modules/greeting-card/domain/payment-plan"
import { depositAmountVnd } from "@/modules/greeting-card/domain/payment-schedule"
import type { BrochurePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { PaymentProofBadge } from "./payment-proof-badge"
import { useNow } from "@/components/greeting-card/work/use-worklist"
import { balanceCollectionBlocker } from "@/modules/greeting-card/domain/balance-collection"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Chờ thanh toán", className: "bg-warning-bg text-warning-text" },
  CONFIRMED: { label: "Đã xác nhận", className: "bg-info-bg text-info" },
  PROCESSING: { label: "Đang xử lý", className: "bg-info-bg text-info" },
  DELIVERED: { label: "Đã giao", className: "bg-success-bg text-success" },
  COMPLETED: { label: "Hoàn tất", className: "bg-success-bg text-success" },
  CANCELLED: { label: "Đã huỷ", className: "bg-danger-bg text-danger" },
}

/** Bảng đơn Thẻ chào cho Điều hành: tiền đã thu/còn lại + thu, huỷ, hoàn. */
export function AdminOrderTable({
  orders,
  onAction,
  shopDepositPercent = 0,
  policy,
}: {
  orders: AdminOrder[]
  onAction: (a: OrderAction) => void
  /** % cọc hiện tại của tiệm — cho đơn cũ chưa chụp kế hoạch thanh toán */
  shopDepositPercent?: number
  policy?: BrochurePaymentPolicy | undefined
}) {
  // Mốc tự duyệt ảnh sau 10 phút — đồng hồ cập nhật mỗi phút, không gọi Date.now() lúc render
  const now = useNow()
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const makerActionLower = terms.makerAction.toLowerCase()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body-sm">
        <thead className="bg-surface-muted text-text-muted text-caption uppercase border-b border-border">
          <tr>
            <th className="px-4 py-3">Mã đơn</th>
            <th className="px-4 py-3">Mẫu</th>
            <th className="px-4 py-3">Khách hàng</th>
            <th className="px-4 py-3 text-right">Tổng</th>
            <th className="px-4 py-3 text-right">Đã thu</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3 text-right">Tác vụ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => {
            const balance = Math.max(0, o.total_vnd - o.paid_vnd)
            const awaitingQuote = o.total_vnd <= 0 && o.status !== "CANCELLED"
            const badge = STATUS_BADGE[o.status] ?? { label: o.status, className: "bg-surface-muted" }
            const cancellable = o.status !== "CANCELLED" && o.status !== "COMPLETED" && o.delivery_status !== "DELIVERED"

            const plan = readPaymentPlan(o.pricing_rule_ref)
            const pct = plan?.depositPercent ?? shopDepositPercent
            const depositAmount = depositAmountVnd(o.total_vnd, pct)
            const isDepositOrder = pct > 0 && depositAmount < o.total_vnd
            const isDepositPaid = isDepositOrder && o.paid_vnd >= depositAmount
            const isFullyPaid = o.total_vnd > 0 && o.paid_vnd >= o.total_vnd
            const requireFull = policy?.requireFullBeforeDispatch !== false
            const canAdminConfirmOrder =
              o.status === "CONFIRMED" &&
              (o.production_status === "WAITING" || !o.production_status) &&
              o.delivery_status !== "DELIVERED"

            // Thu lần 2: cùng luật với máy chủ (`balanceCollectionBlocker`) để nút không lệch điều máy chủ cho phép
            const isReady = o.production_status === "READY"
            const isReportedPaid = balance > 0 && o.status !== "CANCELLED" && o.greeting_sessions[0]?.status === "PAYMENT_REPORTED"
            const balanceBlocker = balanceCollectionBlocker(
              {
                productionStatus: o.production_status ?? "",
                deliveryStatus: o.delivery_status,
                customerReported: isReportedPaid,
                qcRecords: o.qc_records ?? [],
              },
              { requireFullBeforeDispatch: requireFull, allowShipperCash: policy?.allowShipperCash },
              now
            )

            let collectButton: { label: string; className: string } | null = null
            if (!isFullyPaid && balance > 0 && o.status !== "CANCELLED" && !awaitingQuote) {
              if (isReportedPaid) {
                // Khách đã bấm chuyển khoản -> Ưu tiên hiện nút Phê duyệt cho Điều hành
                // Đơn trả đủ (không cọc) không có "cọc" — trước đây hiện "Phê duyệt cọc (0 đ)"
                collectButton = {
                  label: isDepositPaid
                    ? `Phê duyệt đợt 2 (${vnd(balance)})`
                    : isDepositOrder
                    ? `Phê duyệt cọc (${vnd(Math.max(0, depositAmount - o.paid_vnd))})`
                    : `Phê duyệt thanh toán (${vnd(balance)})`,
                  className: "h-8 bg-success hover:bg-success/90 text-white text-caption font-bold gap-1 shadow-sm ring-2 ring-success/40",
                }
              } else if (!isDepositOrder) {
                collectButton = {
                  label: `Thu tiền (${vnd(o.total_vnd)})`,
                  className: "h-8 bg-success hover:bg-success/90 text-white text-caption font-bold gap-1",
                }
              } else if (!isDepositPaid) {
                collectButton = {
                  label: `Thu tiền cọc (${vnd(depositAmount)})`,
                  className: "h-8 bg-primary hover:bg-primary-dark text-white text-caption font-bold gap-1",
                }
              } else if (balanceBlocker === null) {
                collectButton = {
                  label: `Thu lần 2 (${vnd(balance)})`,
                  className: "h-8 bg-success hover:bg-success/90 text-white text-caption font-bold gap-1",
                }
              }
            }

            const coordinatorPayment = o.payments?.find(
              (p) => p.reference?.startsWith("COORDINATOR-") || p.note?.includes("[Điều phối")
            )

            return (
              <tr key={o.id} data-focus-key={o.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-mono font-bold text-primary">{o.code}</div>
                  <div className="text-caption text-text-muted">
                    {o.greeting_sessions[0]?.send_code ?? "—"} · {new Date(o.created_at).toLocaleString("vi-VN")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ProductCell order={o} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-text">{o.customer?.name || "Khách hàng"}</div>
                  <div className="text-caption text-text-muted">{o.customer?.phone ?? ""}</div>
                </td>
                <td className="px-4 py-3 text-right font-extrabold">
                  {awaitingQuote ? <span className="text-warning-text">Chờ báo giá</span> : vnd(o.total_vnd)}
                </td>
                <td className="px-4 py-3 text-right">
                  <AdminPaymentPlanCell order={o} shopDepositPercent={shopDepositPercent} />
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-caption font-bold ${badge.className}`}>{badge.label}</span>
                  {canAdminConfirmOrder && (
                    <div className="mt-1 text-caption font-bold text-warning-text bg-warning-bg px-2 py-0.5 rounded-md border border-warning/30 inline-flex items-center gap-1">
                      📋 Chờ xác nhận đơn
                    </div>
                  )}
                  {balance > 0 && o.status !== "CANCELLED" && o.greeting_sessions[0]?.status === "PAYMENT_REPORTED" && (
                    <div className="mt-1 text-caption font-bold text-info">Khách báo đã chuyển</div>
                  )}
                  {(o.paymentProofUrl || o.paymentProofBalanceUrl) && (
                    <div className="mt-1.5 flex flex-col gap-1 items-start">
                      {o.paymentProofUrl && (
                        <PaymentProofBadge
                          hasProofUrl={true}
                          analysis={o.paymentProofAnalysis}
                        />
                      )}
                      {o.paymentProofBalanceUrl && (
                        <PaymentProofBadge
                          hasProofUrl={true}
                          analysis={o.paymentProofBalanceAnalysis}
                        />
                      )}
                    </div>
                  )}
                  {coordinatorPayment && (
                    <div className="mt-1 flex items-center gap-1 text-caption font-bold text-success bg-success-bg/60 px-2 py-0.5 rounded-md border border-success/30">
                      🛡️ <span>Điều phối đã Xác nhận</span>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end items-center gap-1.5 flex-wrap">
                    {awaitingQuote && (
                      <Button type="button" size="sm" variant="outline" onClick={() => onAction({ type: "quote", order: o })} className="h-8 text-caption gap-1">
                        <Tag size={13} /> Báo giá
                      </Button>
                    )}

                    {/* 1. Đã thu đủ 100% */}
                    {isFullyPaid && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-bold bg-success/15 text-success">
                        <Check size={12} /> {coordinatorPayment ? "Đã thu đủ (Đ/P duyệt)" : "Đã thu đủ"}
                      </span>
                    )}

                    {/* Gate 1b: Xác nhận đơn hàng (Điều hành) */}
                    {canAdminConfirmOrder && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onAction({ type: "confirm-order", order: o })}
                          className="h-8 bg-success hover:bg-success/90 text-white text-caption font-extrabold gap-1 shadow-sm ring-2 ring-success/30"
                          title="Xác nhận cửa hàng nhận thực hiện đơn (chuyển sang sản xuất & thông báo khách)"
                        >
                          <ClipboardCheck size={13} /> Xác nhận đơn
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onAction({ type: "reject-order", order: o })}
                          className="h-8 border-danger/40 text-danger hover:bg-danger-bg text-caption font-bold gap-1"
                          title="Từ chối đơn & hoàn tiền cho khách"
                        >
                          <XCircle size={13} /> Từ chối
                        </Button>
                      </>
                    )}

                    {/* 2. Nút thu tiền duy nhất khi đủ điều kiện */}
                    {collectButton && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onAction({ type: "collect", order: o })}
                        className={collectButton.className}
                      >
                        <Check size={13} /> {collectButton.label}
                      </Button>
                    )}

                    {/* 3. Badge trạng thái cho đơn cọc chưa đủ điều kiện thu lần 2 */}
                    {!collectButton && isDepositOrder && isDepositPaid && balance > 0 && o.status !== "CANCELLED" && !awaitingQuote && (
                      requireFull ? (
                        isReady ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-semibold bg-warning-bg text-warning-text border border-warning/30" title="Chờ khách duyệt ảnh sản phẩm hoặc hết 10 phút đếm ngược">
                            ⏳ {coordinatorPayment ? "Đ/P đã duyệt cọc" : "Đã cọc"} · Chờ duyệt ảnh
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-semibold bg-success/10 text-success border border-success/30" title={`Đã nhận tiền cọc thành công. Chờ ${makerActionLower} xong mới thu lần 2.`}>
                            ✓ {coordinatorPayment ? "Đ/P đã duyệt cọc" : "Đã cọc"} · Chờ {makerActionLower} xong
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-semibold bg-info/10 text-info border border-info/30" title="Đã nhận tiền cọc. Phần còn lại sẽ thu sau khi hoàn tất thành công.">
                          ✓ {coordinatorPayment ? "Đ/P đã duyệt cọc" : "Đã cọc"} · Thu sau giao
                        </span>
                      )
                    )}

                    {o.pending_refund_vnd != null ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-semibold bg-warning-bg text-warning-text border border-warning/30" title="Khoản hoàn của đề xuất huỷ đã duyệt — đánh dấu đã hoàn ở Hộp việc, mục Cần hoàn tiền">
                        <RotateCcw size={12} aria-hidden="true" /> Chờ hoàn {vnd(o.pending_refund_vnd)} · xử lý ở Hộp việc
                      </span>
                    ) : o.paid_vnd > 0 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => onAction({ type: "refund", order: o })} className="h-8 text-caption gap-1">
                        <RotateCcw size={13} /> Hoàn tiền
                      </Button>
                    )}
                    {cancellable && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Huỷ đơn ${o.code}`}
                        title="Huỷ đơn"
                        onClick={() => onAction({ type: "cancel", order: o })}
                        className="h-8 w-8 p-0 text-danger"
                      >
                        <Ban size={14} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ProductCell({ order }: { order: AdminOrder }) {
  const c = paymentCheckOf(order)
  return (
    <div className="flex items-center gap-2 min-w-40">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
        <FlowerImage src={c.imageUrl} alt={c.productName} sizes="40px" fallback="icon" className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold text-text">{c.productName}</div>
        <div className="text-caption text-text-muted">
          {c.listedPriceVnd !== null ? `Công bố ${vnd(c.listedPriceVnd)}` : "Chưa niêm yết giá"}
          {c.reasons.length > 0 && <span className="text-warning-text"> · {c.reasons.length} điều chỉnh</span>}
        </div>
      </div>
    </div>
  )
}
