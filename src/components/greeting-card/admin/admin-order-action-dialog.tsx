"use client"

import { Input } from "@/components/ui/input"
import { IN_TRANSIT_CANCEL_WARNING, isInTransit } from "@/modules/greeting-card/domain/cancellation-request"
import React, { useState } from "react"
import { PaymentCheckPanel } from "./payment-check-panel"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { type BrochurePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { readPaymentPlan } from "@/modules/greeting-card/domain/payment-plan"
import { depositAmountVnd } from "@/modules/greeting-card/domain/payment-schedule"
import { vnd, type ActionResult, type AdminOrderDialogAction } from "./admin-order-types"
import { customerPaymentMessage } from "@/modules/greeting-card/domain/customer-notifications"
import { AlertTriangle, Info } from "@/components/ui/icons"
import { useNow } from "@/components/greeting-card/work/use-worklist"
import { OrderPaymentProofView } from "@/components/greeting-card/order-payment-proof-view"
import { balanceCollectionBlocker } from "@/modules/greeting-card/domain/balance-collection"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

const FIELD = "w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text"

const TITLES = {
  quote: "Báo giá cho khách",
  collect: "Ghi nhận đã nhận tiền",
  cancel: "Huỷ đơn hàng",
  refund: "Ghi nhận hoàn tiền",
} as const

/** Hộp thoại thu tiền / huỷ đơn / hoàn tiền cho một đơn Thẻ chào. */
export function AdminOrderActionDialog({
  action,
  policy,
  onClose,
  onDone,
}: {
  action: AdminOrderDialogAction
  policy: BrochurePaymentPolicy
  onClose: () => void
  onDone: (result: ActionResult) => void
}) {
  const { order, type } = action
  const now = useNow()
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)

  const plan = readPaymentPlan(order.pricing_rule_ref)
  const pct = plan?.depositPercent ?? policy.depositPercent
  const depositAmount = depositAmountVnd(order.total_vnd, pct)
  const isDepositOrder = pct > 0 && depositAmount < order.total_vnd
  const isDepositPaid = isDepositOrder && order.paid_vnd >= depositAmount
  const requireFull = policy.requireFullBeforeDispatch !== false

  const isReported = order.greeting_sessions?.some((s) => s.status === "PAYMENT_REPORTED") ?? false

  // Điều kiện thu đợt 2 của đơn đặt cọc — cùng luật với máy chủ
  const blockReason =
    type === "collect" && isDepositOrder && isDepositPaid
      ? balanceCollectionBlocker(
          {
            productionStatus: order.production_status ?? "",
            deliveryStatus: order.delivery_status,
            customerReported: isReported,
            qcRecords: order.qc_records ?? [],
          },
          { requireFullBeforeDispatch: requireFull, allowShipperCash: policy.allowShipperCash },
          now
        )
      : null
  const isBlocked = blockReason !== null

  const suggested =
    type === "collect"
      ? isDepositOrder && !isDepositPaid
        ? Math.max(0, depositAmount - order.paid_vnd)
        : Math.max(0, order.total_vnd - order.paid_vnd)
      : type === "refund"
      ? order.paid_vnd
      : 0

  const [amount, setAmount] = useState(suggested ? String(suggested) : "")
  const [text, setText] = useState("")
  const inTransit = isInTransit(order.delivery_status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Điều hành cảnh báo khoản Lần 1 khách đã báo nhưng tiền chưa về (PO 15/10/2026)
  const canRejectReported = type === "collect" && order.paid_vnd === 0 && (isReported || Boolean(order.paymentProofUrl))
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  async function rejectReported() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/orders/${order.id}/reject-reported-payment`, "POST", {
        ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
      }, "Không gửi được cảnh báo")
      onDone({ message: `Đã cảnh báo chưa nhận được tiền cho đơn ${order.code}. Trang của khách quay lại chờ chuyển khoản.` })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  let dialogTitle: string = TITLES[type]
  let amountLabel = "Số tiền đã nhận (đ)"
  let submitButtonLabel: string = TITLES[type]

  if (type === "collect") {
    if (isReported && !isDepositOrder) {
      // Đơn trả đủ (không cọc): trước đây hiện "Phê duyệt tiền cọc (Đợt 1 — 0%)"
      dialogTitle = "Phê duyệt thanh toán (100%)"
      amountLabel = "Số tiền đã nhận (đ)"
      submitButtonLabel = `Phê duyệt đã nhận (${vnd(suggested)})`
    } else if (isReported) {
      dialogTitle = isDepositPaid
        ? `Phê duyệt thanh toán phần còn lại (Đợt 2)`
        : `Phê duyệt tiền cọc (Đợt 1 — ${pct}%)`
      amountLabel = isDepositPaid ? "Số tiền còn lại đã nhận (đ)" : "Số tiền cọc đã nhận (đ)"
      submitButtonLabel = isDepositPaid
        ? `Phê duyệt đã nhận (${vnd(suggested)})`
        : `Phê duyệt nhận cọc (${vnd(suggested)})`
    } else if (isDepositOrder && !isDepositPaid) {
      dialogTitle = `Thu tiền cọc (Đợt 1 — ${pct}%)`
      amountLabel = `Số tiền cọc đã nhận (đ)`
      submitButtonLabel = `Xác nhận nhận cọc (${vnd(suggested)})`
    } else if (isDepositOrder && isDepositPaid) {
      dialogTitle = `Thu phần còn lại (Đợt 2)`
      amountLabel = `Số tiền còn lại đã nhận (đ)`
      submitButtonLabel = `Xác nhận nhận đủ (${vnd(suggested)})`
    } else {
      dialogTitle = "Ghi nhận đã nhận tiền (100%)"
      submitButtonLabel = "Xác nhận nhận đủ"
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || isBlocked) return
    setBusy(true)
    setError(null)
    const amountVnd = Number(amount.replace(/\D/g, ""))
    try {
      if (type === "quote") {
        await apiSend(`/api/v1/greeting-card/orders/${order.id}/quote`, "POST", {
          total_vnd: amountVnd, ...(text.trim() ? { reason: text.trim() } : {}),
        }, "Không lưu được báo giá")
        onDone({ message: `Đã báo giá ${vnd(amountVnd)} cho đơn ${order.code}. Khách mở lại link sẽ thấy mã QR thanh toán.` })
      } else if (type === "collect") {
        await apiSend(`/api/v1/greeting-card/orders/${order.id}/confirm-payment`, "POST", {
          amount_vnd: amountVnd, ...(text.trim() ? { reference: text.trim() } : {}),
        }, "Không ghi nhận được thanh toán")
        onDone({
          message: `Đã ghi nhận ${vnd(amountVnd)} cho đơn ${order.code}.`,
          customerMessage: customerPaymentMessage({
            orderCode: order.code,
            amountVnd,
            balanceVnd: Math.max(0, order.total_vnd - order.paid_vnd - amountVnd),
            trackingUrl: order.greeting_sessions[0]?.send_code ? `${window.location.origin}/b/${order.greeting_sessions[0].send_code}` : null,
          }),
        })
      } else if (type === "cancel") {
        await apiSend(`/api/v1/greeting-card/orders/${order.id}/cancel`, "POST", { reason: text, ...(inTransit ? { confirm_in_transit: true } : {}) }, "Không huỷ được đơn")
        onDone({ message: `Đã huỷ đơn ${order.code}${order.paid_vnd > 0 ? " — hoàn tiền là bước riêng: bấm \"Hoàn tiền\" khi đã chuyển trả khách" : ""}.` })
      } else {
        await apiSend(`/api/v1/greeting-card/orders/${order.id}/refund`, "POST", { amount_vnd: amountVnd, reason: text }, "Không ghi nhận được hoàn tiền")
        onDone({ message: `Đã ghi nhận hoàn ${vnd(amountVnd)} cho đơn ${order.code}.` })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }} size="sm" title={`${dialogTitle} — #${order.code}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-body-sm text-text-muted">
          Tổng đơn {vnd(order.total_vnd)} · Đã thu {vnd(order.paid_vnd)} · Còn {vnd(Math.max(0, order.total_vnd - order.paid_vnd))}
        </p>

        {type === "collect" && isReported && (
          <div role="status" className="p-3.5 rounded-xl bg-success-bg border border-success/30 text-success text-body-sm flex items-start gap-2.5">
            <Info size={18} className="shrink-0 mt-0.5 text-success" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-caption text-success">Khách đã bấm báo chuyển khoản</span>
              <p className="text-body-sm text-text/80 leading-relaxed">
                Khách hàng đã xác nhận chuyển {isDepositPaid ? "phần còn lại" : isDepositOrder ? "tiền cọc" : "đủ tiền"} {vnd(suggested)}. Vui lòng đối soát tài khoản ngân hàng và bấm phê duyệt.
              </p>
            </div>
          </div>
        )}

        {type === "collect" && (order.paymentProofUrl || order.paymentProofBalanceUrl) && (
          <OrderPaymentProofView
            paymentProofUrl={order.paymentProofUrl}
            paymentProofAnalysis={order.paymentProofAnalysis}
            paymentProofBalanceUrl={order.paymentProofBalanceUrl}
            paymentProofBalanceAnalysis={order.paymentProofBalanceAnalysis}
          />
        )}

        {isBlocked && blockReason && (
          <div role="alert" className="p-3.5 rounded-xl bg-warning-bg border border-warning/40 text-warning-text text-body-sm flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-warning-text" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-caption text-warning-text">Chưa đủ điều kiện thu tiền đợt 2</span>
              <p className="text-body-sm text-text/80 leading-relaxed">{blockReason}</p>
            </div>
          </div>
        )}

        {type === "collect" && isDepositOrder && !isDepositPaid && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-body-sm text-primary flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5 text-primary" aria-hidden="true" />
            <span>Đơn áp dụng đặt cọc {pct}%. Xác nhận tiền cọc để chuyển đơn sang xưởng bắt đầu {terms.makerAction.toLowerCase()}.</span>
          </div>
        )}

        {error && <p role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-body-sm">{error}</p>}
        {type === "cancel" && inTransit && (
          <p role="alert" className="p-3 rounded-xl bg-warning-bg text-warning-text text-body-sm font-semibold">⚠ {IN_TRANSIT_CANCEL_WARNING}</p>
        )}
        {type === "quote" && (
          <p className="text-caption text-text-muted">Khách đặt mẫu chưa niêm yết giá. Nhập tổng tiền trọn gói (gồm phí giao) để khách thanh toán.</p>
        )}
        {type !== "cancel" && (
          <label className="flex flex-col gap-1">
            <span className="text-caption font-bold">
              {type === "quote" ? "Tổng tiền báo giá (đ)" : amountLabel}
            </span>
            <Input inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isBlocked} className={FIELD} />
          </label>
        )}
        {(type === "collect" || type === "quote") && <PaymentCheckPanel order={order} />}
        {(
          <label className="flex flex-col gap-1">
            <span className="text-caption font-bold">
              {type === "collect" ? "Mã giao dịch ngân hàng (không bắt buộc)" : type === "quote" ? "Lý do giá chốt (không bắt buộc)" : type === "cancel" ? "Lý do huỷ *" : "Lý do hoàn tiền *"}
            </span>
            <Input
              value={text}
              maxLength={type === "collect" ? 100 : type === "quote" ? 300 : 500}
              required={type === "cancel" || type === "refund"}
              minLength={type === "cancel" || type === "refund" ? 3 : 0}
              onChange={(e) => setText(e.target.value)}
              disabled={isBlocked}
              className={FIELD}
            />
          </label>
        )}
        {canRejectReported && rejecting && (
          <div role="alert" className="p-3.5 rounded-xl bg-danger-bg border border-danger/30 flex flex-col gap-2">
            <span className="font-bold text-caption text-danger">Chưa nhận được tiền khách báo chuyển?</span>
            <p className="text-body-sm text-text/80">Trang của khách sẽ quay lại chờ chuyển khoản và hiện lại mã QR. Sự việc được ghi vào lịch sử đơn.</p>
            <Input value={rejectReason} maxLength={500} onChange={(e) => setRejectReason(e.target.value)} placeholder="Lý do (vd: bill sai tài khoản, chuyển thiếu)" aria-label="Lý do chưa nhận được tiền" className={FIELD} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejecting(false)} disabled={busy}>Quay lại</Button>
              <Button type="button" variant="secondary" onClick={() => void rejectReported()} disabled={busy} className="bg-danger hover:bg-danger/90 text-white">
                {busy ? "Đang xử lý..." : "Xác nhận chưa nhận được tiền"}
              </Button>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          {canRejectReported && !rejecting && (
            <Button type="button" variant="outline" onClick={() => setRejecting(true)} className="mr-auto text-danger border-danger/40">
              <AlertTriangle size={14} aria-hidden="true" /> Chưa nhận được tiền
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
          <Button
            type="submit"
            disabled={busy || isBlocked}
            className={
              isBlocked
                ? "bg-surface-alt text-text-muted cursor-not-allowed"
                : type === "collect" || type === "quote"
                ? "bg-success hover:bg-success/90 text-white"
                : "bg-danger hover:bg-danger/90 text-white"
            }
          >
            {busy ? "Đang xử lý..." : isBlocked ? "Chưa thể thu tiền" : submitButtonLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

