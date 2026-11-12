"use client"

import { Input } from "@/components/ui/input"
import React from "react"
import { Wallet, Tag } from "@/components/ui/icons"

const PANEL = "flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface-alt/30"
const LABEL = "text-caption font-bold text-text flex items-center gap-1.5"

/**
 * Hai ô mã bắt buộc xuất hiện trên mọi ngành:
 *  - Mã thanh toán (đặt cọc / thanh toán theo thỏa thuận)
 *  - Mã ưu đãi (voucher / coupon do tiệm cấp)
 * Placeholder cố tình để trống; khách chỉ nhập khi có mã.
 */
export function OrderCodeFields({
  uid,
  paymentCode,
  promoCode,
  inputClassName,
  onPaymentCodeChange,
  onPromoCodeChange,
}: {
  uid: string
  paymentCode: string
  promoCode: string
  inputClassName: string
  onPaymentCodeChange: (val: string) => void
  onPromoCodeChange: (val: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className={PANEL}>
        <span className={LABEL}>
          <Wallet size={13} className="text-primary" aria-hidden="true" />
          Mã thanh toán
        </span>
        <Input
          type="text"
          id={`${uid}-paymentCode`}
          value={paymentCode}
          maxLength={40}
          placeholder=""
          aria-label="Mã thanh toán"
          autoComplete="off"
          onChange={(e) => onPaymentCodeChange(e.target.value.toUpperCase())}
          className={inputClassName}
        />
      </div>
      <div className={PANEL}>
        <span className={LABEL}>
          <Tag size={13} className="text-primary" aria-hidden="true" />
          Mã ưu đãi
        </span>
        <Input
          type="text"
          id={`${uid}-promoCode`}
          value={promoCode}
          maxLength={40}
          placeholder=""
          aria-label="Mã ưu đãi"
          autoComplete="off"
          onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
          className={inputClassName}
        />
      </div>
    </div>
  )
}
