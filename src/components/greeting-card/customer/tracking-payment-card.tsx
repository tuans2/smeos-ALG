"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Wallet } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { readApiError } from "@/components/greeting-card/api-error"
import type { BrochurePaymentInstructions } from "@/modules/greeting-card/domain/greeting-card-types"
import type { OrderPaymentSummary } from "@/modules/greeting-card/domain/payment-summary"
import { getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"
import { PaymentProofUploader } from "./payment-proof-uploader"

export type TrackingPayment = OrderPaymentSummary & {
  balanceInstructions: BrochurePaymentInstructions | null
  requirePaymentProof?: boolean
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

/**
 * Thanh toán trên trang theo dõi: các đợt (cọc / phần còn lại) và — khi hoa đã xong, tiệm đã
 * gửi ảnh mà đơn còn nợ — mã QR để khách trả phần còn lại.
 */
export function TrackingPaymentCard({
  payment,
  sendCode,
  industryKey,
}: {
  payment: TrackingPayment
  sendCode?: string | null | undefined
  industryKey?: string | null | undefined
}) {
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proofAssetId, setProofAssetId] = useState<string | null>(null)

  const requireProof = payment.requirePaymentProof !== false
  const canReport = !requireProof || !!proofAssetId
  const qr = payment.balanceInstructions
  if (payment.totalVnd <= 0 || payment.milestones.length < 2) return null

  const ot = getIndustryOrderTerms(industryKey)

  async function report() {
    if (!sendCode) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/public/brochure/${sendCode}/payment-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofAssetId: proofAssetId || undefined }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Không gửi được thông báo, vui lòng thử lại"))
      setReported(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được thông báo, vui lòng thử lại")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="tracking-payment-title" className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-alt border border-border">
      <h3 id="tracking-payment-title" className="flex items-center gap-2 text-text font-extrabold text-body">
        <Wallet size={18} className="text-primary" aria-hidden="true" /> Thanh toán
      </h3>
      <dl className="flex flex-col gap-1 text-body-sm">
        <div className="flex justify-between"><dt className="text-text-muted">{ot.trackingProductLineLabel}</dt><dd className="font-bold">{vnd(payment.totalVnd)}</dd></div>
        <div className="flex justify-between"><dt className="text-text-muted">Đã thanh toán</dt><dd className="font-bold text-success">{vnd(payment.paidVnd)}</dd></div>
        <div className="flex justify-between"><dt className="text-text-muted">Còn lại</dt><dd className="font-extrabold text-primary">{vnd(payment.remainingVnd)}</dd></div>
      </dl>
      <ul className="flex flex-col gap-1 text-caption border-t border-border pt-2">
        {payment.milestones.map((m) => (
          <li key={m.seq} className="flex justify-between">
            <span>{m.kind === "DEPOSIT" ? `Đặt cọc ${m.percent}%` : m.kind === "BALANCE" ? `Phần còn lại ${m.percent}%` : "Thanh toán đủ"} · {vnd(m.amountVnd)}</span>
            <span className={m.status === "PAID" ? "font-bold text-success" : "text-text-muted"}>
              {m.status === "PAID" ? "Đã thanh toán" : m.status === "PARTIALLY_PAID" ? "Đã trả một phần" : m.kind === "BALANCE" ? (m.due === "AFTER_DELIVERY" ? "Trả sau khi nhận" : "Trả sau khi hoàn thành") : "Chờ thanh toán"}
            </span>
          </li>
        ))}
      </ul>
      {qr && (
        <div className="flex flex-col items-center gap-2 border-t border-border pt-3">
          <p className="text-body-sm text-text text-center">
            {payment.paidVnd > 0
              ? payment.milestones.some((m) => m.due === "AFTER_DELIVERY")
                ? `Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc ${ot.trackingDeliveryStepLabel === "Nhận phòng" ? "khi nhận phòng." : "khi nhận hàng."}`
                : ot.trackingBalanceContactHint
              : payment.milestones.length > 1
              ? "Vui lòng chuyển khoản tiền đặt cọc qua mã QR bên dưới để xác nhận:"
              : "Vui lòng chuyển khoản qua mã QR bên dưới để thanh toán:"}
          </p>
          <div className="p-2 bg-white rounded-xl border border-border">
            <Image src={qr.qrUrl} alt={`Mã QR thanh toán ${vnd(qr.amount)}`} width={176} height={176} unoptimized className="w-44 h-44 object-contain" />
          </div>
          <p className="text-caption text-text-muted text-center">
            {qr.bankName} · {qr.accountNo} · {qr.accountName}<br />Nội dung chuyển khoản: <strong className="text-text">{qr.transferMemo}</strong>
          </p>
          {sendCode && (
            <div className="w-full flex flex-col gap-2">
              {requireProof && !reported && (
                <PaymentProofUploader
                  sendCode={sendCode}
                  purpose={payment.paidVnd > 0 ? "BALANCE" : "DEPOSIT"}
                  onUploaded={(id) => setProofAssetId(id)}
                  onRemoved={() => setProofAssetId(null)}
                  disabled={busy || reported}
                />
              )}
              <Button
                type="button"
                onClick={() => void report()}
                disabled={busy || reported || !canReport}
                className="w-full"
              >
                {reported
                  ? "Đã báo cửa hàng — chờ xác nhận"
                  : payment.paidVnd > 0
                  ? `Tôi đã thanh toán phần còn lại ${vnd(qr.amount)}`
                  : `Tôi đã chuyển khoản ${vnd(qr.amount)}`}
              </Button>
              {reported && (
                <p className="text-caption text-text-muted font-medium text-center">
                  Thời gian xác nhận chuyển khoản sẽ trong vòng 15’
                </p>
              )}
              {!reported && !canReport && (
                <p className="text-caption text-warning-text font-medium text-center">
                  Vui lòng tải ảnh chuyển khoản để xác nhận
                </p>
              )}
            </div>
          )}
          {error && <p role="alert" className="text-caption text-danger">{error}</p>}
        </div>
      )}
      {!qr && payment.remainingVnd > 0 && (
        <p className="text-body-sm text-text border-t border-border pt-2">
          {payment.paidVnd > 0
            ? ot.trackingBalanceContactHint
            : `Cửa hàng sẽ liên hệ để hướng dẫn thanh toán ${vnd(payment.remainingVnd)}.`}
        </p>
      )}
    </section>
  )
}
