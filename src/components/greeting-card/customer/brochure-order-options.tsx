"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Minus, Plus, Ticket } from "@/components/ui/icons"
import type { ShippingConfig, BrochureQuote } from "@/modules/greeting-card/domain/brochure-pricing"
import { MAX_ORDER_QUANTITY } from "@/modules/greeting-card/domain/brochure-pricing"
import type { QuoteSelection } from "./use-brochure-quote"
import { PaymentCodeField, PaymentDueRows } from "./payment-code-field"
import { getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"
import { isOptionId } from "@/modules/products/domain/product-pricing"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { VariantStepPicker } from "./variant-step-picker"

interface Props {
  variants: NonNullable<GreetingCatalogProduct["variants"]>
  priceDimensions?: GreetingCatalogProduct["priceDimensions"]
  basePrice: number
  shipping: ShippingConfig
  selection: QuoteSelection
  onChange: (patch: Partial<QuoteSelection>) => void
  quote: BrochureQuote | null
  errors: Record<string, string>
  loading: boolean
  industryKey?: string | null | undefined
}

const FIELD = "w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`

/** Size, số lượng, khu vực giao, mã giảm giá (khi tiệm bật), mã thanh toán (khi tiệm có mã) + bảng tổng tiền do server tính (đã trừ ưu đãi). */
export function BrochureOrderOptions({ variants, priceDimensions, basePrice, shipping, selection, onChange, quote, errors, loading, industryKey }: Props) {
  const [voucherInput, setVoucherInput] = useState(selection.voucherCode)
  const isHomestay = industryKey === "HOMESTAY"
  const orderTerms = getIndustryOrderTerms(industryKey)
  const shippingFeeLabel = orderTerms.shippingFeeLabel
  const shippingZoneLabel = orderTerms.shippingZoneLabel
  const freeShippingText = orderTerms.freeShippingText

  return (
    <>
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-surface-alt/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {priceDimensions && priceDimensions.length > 0 && variants.some((v) => v.values) ? (
          <VariantStepPicker
            dimensions={priceDimensions}
            variants={variants}
            value={selection.variantId}
            onChange={(variantId) => onChange({ variantId })}
            error={errors.variantId}
          />
        ) : variants.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="text-caption font-bold text-text">Kích thước / Phiên bản</span>
            <NativeSelect value={selection.variantId} onChange={(e) => onChange({ variantId: e.target.value })} className={FIELD}>
              {/* Khoảng giá theo phiên bản: không có "bản tiêu chuẩn", khách phải chọn */}
              {variants.some((v) => isOptionId(v.id)) ? (
                <option value="">Chọn phiên bản</option>
              ) : (
                <option value="">Bản tiêu chuẩn — {basePrice > 0 ? vnd(basePrice) : "Liên hệ"}</option>
              )}
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {vnd(v.priceVnd)}
                  {v.peakPriceVnd && v.peakPriceVnd !== v.priceVnd ? ` (ngày cao điểm ${vnd(v.peakPriceVnd)})` : ""}
                </option>
              ))}
            </NativeSelect>
            {errors.variantId && <span className="text-caption text-danger">{errors.variantId}</span>}
          </label>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-caption font-bold text-text" id="qty-label">Số lượng</span>
          <div className="flex items-center gap-2" role="group" aria-labelledby="qty-label">
            <Button variant="outline"
              type="button"
              aria-label="Giảm số lượng"
              disabled={selection.quantity <= 1}
              onClick={() => onChange({ quantity: selection.quantity - 1 })}
              className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 h-10 w-10 rounded-lg border border-border flex items-center justify-center disabled:opacity-40"
            >
              <Minus size={16} />
            </Button>
            <span className="w-10 text-center font-extrabold text-body" aria-live="polite">{selection.quantity}</span>
            <Button variant="outline"
              type="button"
              aria-label="Tăng số lượng"
              disabled={selection.quantity >= MAX_ORDER_QUANTITY}
              onClick={() => onChange({ quantity: selection.quantity + 1 })}
              className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 h-10 w-10 rounded-lg border border-border flex items-center justify-center disabled:opacity-40"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      {shipping.zones.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-caption font-bold text-text">{shippingZoneLabel} <span className="text-danger">*</span></span>
          <NativeSelect value={selection.shippingZoneId} onChange={(e) => onChange({ shippingZoneId: e.target.value })} className={FIELD}>
            <option value="">— Chọn khu vực —</option>
            {shipping.zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name} — {z.feeVnd > 0 && !shipping.freeShippingAll ? vnd(z.feeVnd) : "Miễn phí"}</option>
            ))}
          </NativeSelect>
          {shipping.freeShippingAll ? (
            <span className="text-caption text-success">{freeShippingText}</span>
          ) : shipping.freeShippingOverVnd !== null && (
            <span className="text-caption text-text-muted">Miễn phí giao cho đơn từ {vnd(shipping.freeShippingOverVnd)}</span>
          )}
        </label>
      )}

      {/* Khối Mã ưu đãi — luôn có cho mọi ngành */}
      <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface-alt/30">
        <div className="flex items-center justify-between">
          <span className="text-caption font-bold text-text flex items-center gap-1.5">
            <Ticket size={14} className="text-primary" />
            Mã ưu đãi
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={voucherInput}
            maxLength={40}
            placeholder=""
            onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
            className={FIELD}
          />
          <Button variant="outline"
            type="button"
            onClick={() => onChange({ voucherCode: voucherInput.trim() })}
            className="py-0 h-10 px-3 rounded-lg border border-primary text-primary font-bold text-body-sm whitespace-nowrap flex items-center gap-1.5 hover:bg-primary/5 transition"
          >
            <Ticket size={14} /> Áp dụng
          </Button>
        </div>
        {errors.voucherCode && <span className="text-caption text-danger">{errors.voucherCode}</span>}
      </div>

      {quote?.awaitingQuote ? (
        <p role="status" className="text-body-sm text-text-muted border-t border-border pt-2">
          Mẫu này chưa niêm yết giá. Cửa hàng sẽ báo giá trọn gói sau khi nhận đơn — bạn chưa cần thanh toán lúc này.
        </p>
      ) : (
        <dl className="flex flex-col gap-1 text-body-sm border-t border-border pt-2" aria-busy={loading}>
          <div className="flex justify-between"><dt className="text-text-muted">Tạm tính</dt><dd>{quote ? vnd(quote.subtotalVnd) : "—"}</dd></div>
          {quote && quote.discountVnd > 0 && (
            <div className="flex justify-between text-success"><dt>Giảm giá ({quote.voucherCode})</dt><dd>−{vnd(quote.discountVnd)}</dd></div>
          )}
          <div className="flex justify-between">
            <dt className="text-text-muted">{shippingFeeLabel}</dt>
            <dd>{shipping.freeShippingAll ? "Miễn phí" : shipping.zones.length === 0 ? (isHomestay ? "Bao gồm" : "Cửa hàng báo sau") : quote?.shippingZone ? (quote.shippingFeeVnd > 0 ? vnd(quote.shippingFeeVnd) : "Miễn phí") : "—"}</dd>
          </div>
          {quote?.promotionDiscountVnd ? (
            <div className="flex justify-between text-success"><dt>Ưu đãi</dt><dd>−{vnd(quote.promotionDiscountVnd)}</dd></div>
          ) : null}
          {quote?.tierDiscountVnd ? (
            <div className="flex justify-between"><dt className="text-text-muted">{quote.tierLabel}</dt><dd>-{vnd(quote.tierDiscountVnd)}</dd></div>
          ) : null}
          {quote?.peakHourSurchargeVnd ? (
            <div className="flex justify-between"><dt className="text-text-muted">{quote.peakHourLabel}</dt><dd>+{vnd(quote.peakHourSurchargeVnd)}</dd></div>
          ) : null}
          {quote?.holidaySurchargeVnd ? (
            <div className="flex justify-between"><dt className="text-text-muted">Phụ phí ngày lễ ({quote.holidayName})</dt><dd>+{vnd(quote.holidaySurchargeVnd)}</dd></div>
          ) : null}
          <div className="flex justify-between font-extrabold text-body">
            <dt>Tổng đơn hàng</dt>
            <dd className="text-primary">{quote ? vnd(quote.totalVnd) : "—"}</dd>
          </div>
          <PaymentDueRows quote={quote} />
        </dl>
      )}
    </div>

    {/* Khối Mã áp dụng đặt cọc — luôn có cho mọi ngành */}
    <PaymentCodeField
      value={selection.paymentCode}
      onApply={(code) => onChange({ paymentCode: code })}
      quote={quote}
      error={errors.paymentCode}
    />
    </>
  )
}
