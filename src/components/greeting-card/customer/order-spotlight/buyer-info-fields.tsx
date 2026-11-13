"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React from "react"
import { ORDER_FIELD_MAX } from "@/modules/greeting-card/domain/greeting-card-rules"

const LABEL = "block text-body-sm font-bold text-text mb-1"

/** Khối Người mua: họ tên, SĐT, email + công tắc người mua cũng là người nhận (homestay: người nhận phòng). */
export function BuyerInfoFields({
  idPrefix,
  inputClassName,
  customerName,
  customerPhone,
  customerEmail,
  sameAsRecipient,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerEmailChange,
  onSameAsRecipientChange,
  sameAsRecipientLabel = "Tôi cũng là người nhận",
  sameAsRecipientHint = "Dùng họ tên và số điện thoại ở trên để nhận hàng.",
  rememberBuyer,
  onRememberBuyerChange,
}: {
  idPrefix: string
  inputClassName: string
  customerName: string
  customerPhone: string
  customerEmail: string
  /** undefined = không hiện công tắc */
  sameAsRecipient?: boolean | undefined
  onCustomerNameChange: (v: string) => void
  onCustomerPhoneChange: (v: string) => void
  onCustomerEmailChange: (v: string) => void
  onSameAsRecipientChange?: ((v: boolean) => void) | undefined
  sameAsRecipientLabel?: string | undefined
  sameAsRecipientHint?: string | undefined
  /** Lưu họ tên, SĐT, email trên máy này cho lần đặt sau — chỉ khi khách đồng ý */
  rememberBuyer?: boolean | undefined
  onRememberBuyerChange?: ((v: boolean) => void) | undefined
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-customerName`} className={LABEL}>
            Họ tên của bạn <span className="text-danger">*</span>
          </label>
          <Input
            type="text"
            required
            placeholder="VD: Nguyễn Văn A"
            value={customerName}
            maxLength={ORDER_FIELD_MAX.name}
            id={`${idPrefix}-customerName`}
            autoComplete="name"
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-customerPhone`} className={LABEL}>
            Số điện thoại của bạn <span className="text-danger">*</span>
          </label>
          <Input
            type="tel"
            required
            placeholder="VD: 0901234567"
            value={customerPhone}
            maxLength={15}
            id={`${idPrefix}-customerPhone`}
            autoComplete="tel"
            inputMode="tel"
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-customerEmail`} className={LABEL}>
          Email <span className="text-caption font-normal text-text-muted">(tùy chọn)</span>
        </label>
        <Input
          type="email"
          placeholder="VD: email@example.com"
          value={customerEmail}
          maxLength={100}
          id={`${idPrefix}-customerEmail`}
          autoComplete="email"
          onChange={(e) => onCustomerEmailChange(e.target.value)}
          className={inputClassName}
        />
      </div>

      {sameAsRecipient !== undefined && onSameAsRecipientChange && (
        <label
          htmlFor={`${idPrefix}-sameAsRecipient`}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
            sameAsRecipient ? "border-primary/50 bg-primary/5" : "border-border bg-bg hover:border-primary/40"
          }`}
        >
          <Checkbox
            id={`${idPrefix}-sameAsRecipient`}
            checked={sameAsRecipient}
            onCheckedChange={(checked) => onSameAsRecipientChange((checked === true))}
            className="h-5 w-5 shrink-0 accent-primary"
          />
          <span className="min-w-0">
            <span className="block text-body-sm font-bold text-text">{sameAsRecipientLabel}</span>
            <span className="block text-caption text-text-muted">{sameAsRecipientHint}</span>
          </span>
        </label>
      )}

      {rememberBuyer !== undefined && onRememberBuyerChange && (
        <label htmlFor={`${idPrefix}-rememberBuyer`} className="flex cursor-pointer items-center gap-3 text-body-sm text-text-muted">
          <Checkbox
            id={`${idPrefix}-rememberBuyer`}
            checked={rememberBuyer}
            onCheckedChange={(checked) => onRememberBuyerChange(checked === true)}
            className="h-5 w-5 shrink-0 accent-primary"
          />
          Lưu thông tin người đặt trên máy này cho lần sau
        </label>
      )}
    </>
  )
}
