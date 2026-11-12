"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Check, Gift, ShieldCheck, FileText } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { BrochureQuote } from "@/modules/greeting-card/domain/brochure-pricing"
import type { CustomerOrderSubmitInput, ProductSnapshot } from "@/modules/greeting-card/domain/greeting-card-types"
import type { PublicAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"
import { PrivacyNotice } from "./privacy-notice"
import { openShopInfo } from "./shop-info-sheet"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"
import { useI18n } from "@/lib/i18n"
import React, { useState } from "react"

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-body-sm text-text-muted">{label}</dt>
      <dd className={`text-right text-body-sm ${strong ? "font-extrabold text-primary" : "font-semibold text-text"}`}>{value}</dd>
    </div>
  )
}

/** "dd/mm/yyyy" từ "yyyy-mm-dd" (ngày giao khách đã chọn). */
function viDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}/${m}/${y}` : iso
}

/**
 * Bước "Xem lại đơn" trước khi gửi: khách kiểm mẫu, số tiền, người nhận, ngày giờ giao
 * rồi mới xác nhận — tránh đặt nhầm và đúng chuẩn giao kết hợp đồng trực tuyến.
 */
export function OrderReview(props: {
  product: ProductSnapshot
  variantName: string | null
  input: CustomerOrderSubmitInput
  quote: BrochureQuote | null
  appliedPolicies?: PublicAppliedPolicies | null | undefined
  submitting: boolean
  error: string | null
  industryKey?: string | null | undefined
  onEdit: () => void
  onConfirm: (confirmedTerms: boolean) => void
}) {
  const { t, locale } = useI18n()
  const isEn = locale === "en"
  const vnd = (n: number) => isEn ? `${n.toLocaleString("en-US")} VND` : `${n.toLocaleString("vi-VN")} đ`

  const { product, input, quote, appliedPolicies, industryKey } = props
  const terms = getIndustryTerminology(industryKey)
  const orderTerms = getIndustryOrderTerms(industryKey)
  const isHomestay = industryKey === "HOMESTAY"
  const awaitingQuote = quote?.awaitingQuote || (quote?.totalVnd ?? product.price) <= 0
  // Có thỏa thuận → khách phải tự tick (không tick sẵn); máy chủ cũng chặn nếu thiếu
  const needsTerms = (appliedPolicies?.agreements.length ?? 0) > 0
  const [termsAgreed, setTermsAgreed] = useState(false)

  const selectedPromo = appliedPolicies?.promotions.find((p) => p.id === input.selectedPromotionId)

  return (
    <section aria-labelledby="order-review-title" className="flex flex-col gap-4">
      <h2 id="order-review-title" className="text-title font-extrabold text-text">
        {isHomestay
          ? (isEn ? "Review Booking Details" : "Xem lại thông tin đặt phòng")
          : (isEn ? "Review Order Before Submitting" : "Xem lại đơn trước khi đặt")}
      </h2>

      {/* Ảnh mẫu đã chọn — khách nhìn lại đúng sản phẩm trước khi xác nhận */}
      <figure className="flex items-center gap-4 rounded-xl border border-border bg-surface-alt p-3">
        <FlowerImage
          src={product.imageUrl}
          driveLink={product.driveLink}
          alt={`Ảnh mẫu ${product.name}`}
          sizes="(min-width: 640px) 128px, 96px"
          fallback="icon"
          className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border sm:h-32 sm:w-32"
        />
        <figcaption className="min-w-0 flex-1">
          <p className="text-caption text-text-muted">
            {isHomestay
              ? (isEn ? "Selected room type" : "Hạng phòng bạn đã chọn")
              : (isEn ? "Selected item" : "Mẫu bạn đã chọn")}
          </p>
          <p className="text-body font-extrabold text-text">{product.name}</p>
          {props.variantName && <p className="text-body-sm text-text-muted">{props.variantName}</p>}
        </figcaption>
      </figure>

      <dl className="rounded-xl border border-border bg-surface-alt px-4 py-2 divide-y divide-border">
        <Row label={isHomestay ? (isEn ? "Room Type" : "Hạng phòng") : (isEn ? "Product" : terms.sampleProduct)} value={props.variantName ? `${product.name} · ${props.variantName}` : product.name} />
        {quote && quote.quantity > 1 && <Row label={isHomestay ? (isEn ? "Nights / Rooms" : "Số đêm / Số phòng") : (isEn ? "Quantity" : "Số lượng")} value={String(quote.quantity)} />}
        {quote && !awaitingQuote && <Row label={isEn ? "Subtotal" : "Tạm tính"} value={vnd(quote.subtotalVnd)} />}
        {quote && quote.discountVnd > 0 && <Row label={`${isEn ? "Discount" : "Giảm giá"}${quote.voucherCode ? ` (${quote.voucherCode})` : ""}`} value={`− ${vnd(quote.discountVnd)}`} />}
        {quote?.shippingZone && (
          <Row label={`${isEn ? "Shipping Fee" : orderTerms.shippingFeeLabel} (${quote.shippingZone.name})`} value={quote.shippingFeeVnd > 0 ? vnd(quote.shippingFeeVnd) : (isEn ? "Free" : "Miễn phí")} />
        )}
        {quote?.promotionDiscountVnd ? <Row label={`${isEn ? "Promotion" : "Ưu đãi"}${selectedPromo ? ` (${selectedPromo.title})` : ""}`} value={`− ${vnd(quote.promotionDiscountVnd)}`} /> : null}
        {quote?.holidaySurchargeVnd ? <Row label={`${isEn ? "Holiday surcharge" : "Phụ phí ngày lễ"} (${quote.holidayName ?? ""})`} value={`+ ${vnd(quote.holidaySurchargeVnd)}`} /> : null}
        {quote?.tierDiscountVnd ? <Row label={quote.tierLabel ?? (isEn ? "Member discount" : "Ưu đãi hạng khách")} value={`- ${vnd(quote.tierDiscountVnd)}`} /> : null}
        {quote?.peakHourSurchargeVnd ? <Row label={quote.peakHourLabel ?? (isEn ? "Peak-hour surcharge" : "Phụ phí giờ cao điểm")} value={`+ ${vnd(quote.peakHourSurchargeVnd)}`} /> : null}
        <Row label={isHomestay ? (isEn ? "Total Booking Fee" : "Tổng tiền đặt phòng") : (isEn ? "Total" : "Tổng đơn hàng")} value={awaitingQuote ? (isEn ? "Calculated later" : "Cửa hàng báo giá sau") : vnd(quote?.totalVnd ?? product.price)} strong />
        {!awaitingQuote && quote?.paymentPlan && quote.paymentPlan.dueLaterVnd > 0 && (
          <>
            <Row label={`${isEn ? "Deposit today" : "Đặt cọc hôm nay"} (${quote.paymentPlan.depositPercent}%)`} value={vnd(quote.paymentPlan.dueNowVnd)} strong />
            <Row label={isHomestay ? (isEn ? "Balance upon check-in" : "Thanh toán khi nhận phòng") : (isEn ? "Balance upon delivery" : "Thanh toán phần còn lại khi nhận hàng")} value={vnd(quote.paymentPlan.dueLaterVnd)} />
          </>
        )}
      </dl>

      <dl className="rounded-xl border border-border px-4 py-2 divide-y divide-border">
        <Row label={isEn ? "Customer" : orderTerms.customerRoleLabel} value={`${input.customerName} · ${input.customerPhone}${input.customerEmail ? ` · ${input.customerEmail}` : ""}`} />
        <Row label={isEn ? "Recipient" : orderTerms.recipientRoleLabel} value={`${input.recipientName} · ${input.recipientPhone}`} />
        <Row label={isEn ? "Delivery schedule" : orderTerms.deliveryTimeLabel} value={`${viDate(input.deliveryDate)} · ${input.deliveryTimeSlot ?? ""}`} />
        <Row label={isEn ? "Address" : orderTerms.addressLabel} value={input.deliveryAddress} />
        {input.cardMessage?.trim() && <Row label={isHomestay ? (isEn ? "House rules & greeting" : "Nội quy & Thẻ chào mừng") : (isEn ? "Greeting card" : terms.printablesTitle)} value={`“${input.cardMessage.trim()}”`} />}
        {input.senderNote?.trim() && <Row label={isHomestay ? (isEn ? "Requests for Host" : "Yêu cầu cho Quản gia") : (isEn ? "Order notes" : "Ghi chú đơn hàng")} value={input.senderNote.trim()} />}
        {input.deliveryNote?.trim() && <Row label={isEn ? "Courier instructions" : "Ghi chú thêm"} value={input.deliveryNote.trim()} />}
        {input.mapUrl?.trim() && <Row label={isEn ? "Map location" : "Vị trí bản đồ"} value={isEn ? "Google Maps link attached" : "Đã gửi link Google Maps"} />}
      </dl>

      {/* CHÍNH SÁCH: ƯU ĐÃI, (lối mở) CAM KẾT, THỎA THUẬN (SPEC #2 & #5) */}
      <div className="space-y-3">
        {selectedPromo && (
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <h4 className="text-caption font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Gift size={14} />
              <span>{isEn ? "Applied order promotion" : "Ưu đãi áp dụng cho đơn hàng"}</span>
            </h4>
            <p className="text-body-sm font-bold text-text">{selectedPromo.title}</p>
            <p className="text-caption text-text-muted">{selectedPromo.customerText}</p>
          </div>
        )}

        {/* Cam kết chuyển lên khung "Thông tin cửa hàng" ở thanh trên cùng (PO 08/10/2026) — ở đây chỉ còn lối mở */}
        <Button variant="outline"
          type="button"
          onClick={() => openShopInfo("commitments")}
          className="py-0 justify-start flex min-h-11 w-full items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-3.5 text-left text-body-sm font-bold text-success hover:bg-success/5"
        >
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{isEn ? "View store commitments & guarantees" : "Xem cam kết của cửa hàng"}</span>
        </Button>

        {appliedPolicies?.agreements && appliedPolicies.agreements.length > 0 && (
          <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-2">
            <h4 className="text-caption font-extrabold uppercase tracking-wider text-text flex items-center gap-1.5">
              <FileText size={14} />
              <span>{isEn ? "Terms & Agreements" : orderTerms.agreementHeading} ({appliedPolicies.agreements.length})</span>
            </h4>
            <ul className="space-y-1.5 text-caption text-text-muted">
              {appliedPolicies.agreements.map((a) => (
                <li key={a.id} className="flex items-start gap-1.5">
                  <span className="text-text-muted font-bold">•</span>
                  <span><strong className="text-text">{a.title}:</strong> {a.customerText}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CHECKBOX XÁC NHẬN THỎA THUẬN (SPEC #2 D, #5) */}
      {needsTerms && <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-bg cursor-pointer select-none">
        <Checkbox
          checked={termsAgreed}
          onCheckedChange={(checked) => setTermsAgreed((checked === true))}
          className="mt-0.5 rounded border-border text-primary focus:ring-primary w-4 h-4"
        />
        <span className="text-caption leading-relaxed text-text">
          {isEn
            ? `I have read and agree to the ${appliedPolicies?.agreements.length} terms & agreements above for this order.`
            : `Tôi đã đọc và đồng ý với ${appliedPolicies?.agreements.length} ${isHomestay ? "quy định & thỏa thuận" : "thỏa thuận"} ở trên ${isHomestay ? "cho kỳ lưu trú này" : "cho đơn hàng này"}.`}
        </span>
      </label>}

      {props.error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-bg p-3 text-body-sm text-danger">
          {props.error}
        </p>
      )}

      <Button
        type="button"
        onClick={() => props.onConfirm(needsTerms && termsAgreed)}
        disabled={props.submitting || (needsTerms && !termsAgreed)}
        className="h-12 w-full gap-2 rounded-xl text-body font-extrabold"
      >
        <Check size={18} aria-hidden="true" />
        {props.submitting
          ? (isHomestay ? (isEn ? "Submitting booking request..." : "Đang gửi yêu cầu đặt phòng...") : (isEn ? "Submitting order..." : "Đang gửi đơn hàng..."))
          : awaitingQuote
          ? (isHomestay ? (isEn ? "Confirm Booking Request" : "Xác nhận gửi yêu cầu") : (isEn ? "Confirm Order" : "Xác nhận gửi đơn"))
          : (isEn ? "Confirm & Proceed to Payment" : orderTerms.confirmButtonText)}
      </Button>
      <PrivacyNotice industryKey={props.industryKey} />
      <Button type="button" variant="ghost" onClick={props.onEdit} disabled={props.submitting} className="gap-1.5 text-text-muted">
        <ArrowLeft size={16} aria-hidden="true" />
        {isEn ? "Edit Information" : "Sửa thông tin"}
      </Button>
    </section>
  )
}
