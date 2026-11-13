"use client"

import React, { useId, useState } from "react"
import { ArrowLeft, Send, AlertCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { ORDER_FIELD_MAX, MAX_DELIVERY_LEAD_DAYS } from "@/modules/greeting-card/domain/greeting-card-rules"
import type { ProductSnapshot, CustomerOrderSubmitInput, GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import type { ShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import { BrochureOrderOptions } from "./brochure-order-options"
import { useBrochureQuote } from "./use-brochure-quote"
import { OrderReview } from "./order-review"
import { useOrderDraft } from "./use-order-draft"
import { useSavedState } from "./use-saved-state"
import { HoneypotField } from "./honeypot-field"
import { earliestDeliveryDate } from "@/modules/greeting-card/domain/delivery-schedule"
import { PromotionPicker } from "./promotion-picker"
import { customerChoosesPromotion } from "@/modules/greeting-card/domain/order-policies"
import { SelectedProductHeader } from "./selected-product-header"
import type { PublicAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { HomestayOrderFields, calculateNights } from "./homestay-order-fields"
import { StandardOrderFields } from "./standard-order-fields"
import { useBrochureOrderSubmit } from "./use-brochure-order-submit"
import { useProductAvailability } from "./use-product-availability"
import { OrderFocusProvider } from "./order-spotlight/order-focus-context"
import { SpotlightBlock } from "./order-spotlight/spotlight-block"
import { BuyerInfoFields } from "./order-spotlight/buyer-info-fields"
import { CompactOrderNotes } from "./order-spotlight/compact-order-notes"
import { orderErrorBlock } from "./order-spotlight/order-error-block"

interface BrochureOrderFormProps {
  productSnapshot: ProductSnapshot
  variants: NonNullable<GreetingCatalogProduct["variants"]>
  /** Kiểu "Khoảng giá": khách chọn lần lượt từng nhóm đặc điểm */
  priceDimensions?: GreetingCatalogProduct["priceDimensions"]
  shipping: ShippingConfig
  appliedPolicies?: PublicAppliedPolicies | null | undefined
  quoteUrl: string
  quoteExtraBody?: Record<string, string> | undefined
  industryKey?: string | null | undefined
  onBack: () => void
  onSubmit: (input: CustomerOrderSubmitInput) => Promise<void>
}

const INPUT =
  "w-full min-w-0 h-11 px-3 rounded-lg border border-border bg-bg text-title font-normal text-text placeholder:text-body placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20"

export function BrochureOrderForm({
  productSnapshot,
  variants,
  priceDimensions,
  shipping,
  appliedPolicies,
  quoteUrl,
  quoteExtraBody = {},
  industryKey,
  onBack,
  onSubmit,
}: BrochureOrderFormProps) {
  const terms = getIndustryTerminology(industryKey)
  const isHomestay = industryKey === "HOMESTAY"
  const uid = useId()
  const {
    customerName, customerPhone, customerEmail, recipientName, recipientPhone, deliveryDate, deliveryTimeSlot, addressParts,
    cardMessage, senderNote, deliveryNote, mapUrl,
    setCustomerName, setCustomerPhone, setCustomerEmail, setRecipientName, setRecipientPhone, setDeliveryDate, setDeliveryTimeSlot, setAddressParts,
    setNotes, clearDraft, rememberBuyer, setRememberBuyer,
  } = useOrderDraft()

  const [checkOutDate, setCheckOutDate] = useState(() => {
    if (!deliveryDate) return ""
    return new Date(new Date(`${deliveryDate}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
  })
  const [isSelfBooking, setIsSelfBooking] = useState(true)
  const [adultsCount, setAdultsCount] = useState(2)
  const [childrenCount, setChildrenCount] = useState(0)
  const [transitMethod, setTransitMethod] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  // Khách quay lại sửa đơn mà người nhận trùng người mua → giữ công tắc bật
  const [sameAsRecipient, setSameAsRecipient] = useState(
    () => recipientName.trim() !== "" && recipientName === customerName && recipientPhone === customerPhone
  )
  const buyerIsRecipient = !isHomestay && sameAsRecipient

  const [selectedPromotionId, setSelectedPromotionId] = useState<string>(
    appliedPolicies && !customerChoosesPromotion(appliedPolicies) ? appliedPolicies.promotions[0]?.id ?? "" : ""
  )
  const quoteBody = {
    ...quoteExtraBody,
    ...(selectedPromotionId ? { selectedPromotionId } : {}),
    ...(deliveryDate ? { deliveryDate } : {}),
    ...(deliveryTimeSlot ? { deliveryTimeSlot } : {}),
  }
  const pricing = useBrochureQuote(quoteUrl, quoteBody, customerPhone, { id: productSnapshot.id, variantIds: variants.map((v) => v.id) })
  const availabilityUrl = quoteUrl ? quoteUrl.replace(/\/quote$/, "/check-availability") : null
  const availability = useProductAvailability(availabilityUrl, {
    productId: productSnapshot.id,
    industryKey,
    checkInDate: isHomestay ? deliveryDate : undefined,
    checkOutDate: isHomestay ? checkOutDate : undefined,
    deliveryDate: !isHomestay ? deliveryDate : undefined,
    deliveryTimeSlot,
    variantId: pricing.selection.variantId,
    quantity: pricing.selection.quantity,
  })
  const minDate = earliestDeliveryDate(shipping)
  const maxDate = new Date(Date.parse(`${minDate}T00:00:00Z`) + MAX_DELIVERY_LEAD_DAYS * 86_400_000).toISOString().slice(0, 10)
  const [review, setReview, clearReview] = useSavedState<CustomerOrderSubmitInput | null>(`order-review:${productSnapshot.id}`, null)
  const [website, setWebsite] = useState("")

  const { errorMessage, errorField, loading, handleSubmit, handleConfirm } = useBrochureOrderSubmit({
    isHomestay,
    industryKey,
    customerName,
    customerPhone,
    customerEmail,
    recipientName: buyerIsRecipient ? customerName : recipientName,
    recipientPhone: buyerIsRecipient ? customerPhone : recipientPhone,
    deliveryDate,
    deliveryTimeSlot,
    addressParts,
    cardMessage,
    senderNote,
    deliveryNote,
    mapUrl,
    website,
    checkOutDate,
    isSelfBooking,
    adultsCount,
    childrenCount,
    transitMethod,
    specialRequests,
    selectedPromotionId,
    appliedPolicies,
    shipping,
    pricingSelection: pricing.selection,
    pricingErrors: pricing.errors,
    onSetReview: setReview,
    onSubmit,
    onClearDraft: clearDraft,
    onClearReview: clearReview,
  })

  const errorBlock = orderErrorBlock(errorField?.field, buyerIsRecipient || (isHomestay && isSelfBooking))
  const blockError = (step: number) =>
    errorBlock === step ? { error: errorMessage, errorAttempt: errorField?.attempt } : {}

  if (review) {
    return (
      <div className="w-full max-w-lg mx-auto bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
        <OrderReview
          product={productSnapshot}
          variantName={variants.find((v) => v.id === review.variantId)?.name ?? null}
          input={review}
          quote={pricing.quote}
          appliedPolicies={appliedPolicies}
          industryKey={industryKey}
          submitting={loading}
          error={errorMessage}
          onEdit={() => setReview(null)}
          onConfirm={(agreed) => void handleConfirm(review, agreed)}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl lg:max-w-2xl mx-auto bg-surface rounded-2xl border border-border p-5 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-text-muted hover:text-text text-caption"
        >
          <ArrowLeft size={16} />
          <span>Đổi {terms.sampleProduct.toLowerCase()}</span>
        </Button>
        <span className="text-caption font-bold uppercase tracking-wider text-primary">
          Điền đơn đặt {terms.sampleProduct.toLowerCase()}
        </span>
      </div>

      <SelectedProductHeader product={productSnapshot} variant={variants.find((v) => v.id === pricing.selection.variantId) ?? null} />

      {errorMessage && errorBlock === null && (
        <div
          role="alert"
          ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="mb-5 p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-body-sm flex items-start gap-2"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <OrderFocusProvider>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <HoneypotField value={website} onChange={setWebsite} />

        <SpotlightBlock step={1} {...blockError(1)} title={`Chọn ${terms.sampleProduct.toLowerCase()}`}>
          <BrochureOrderOptions
            variants={variants}
            priceDimensions={priceDimensions}
            basePrice={productSnapshot.price}
            shipping={shipping}
            selection={pricing.selection}
            onChange={pricing.update}
            quote={pricing.quote}
            errors={pricing.errors}
            loading={pricing.loading}
            industryKey={industryKey}
          />
          {appliedPolicies && (
            <PromotionPicker policies={appliedPolicies} value={selectedPromotionId} onChange={setSelectedPromotionId} />
          )}
        </SpotlightBlock>

        <SpotlightBlock step={2} {...blockError(2)} title="Thông tin người mua">
          <BuyerInfoFields
            idPrefix={uid}
            inputClassName={INPUT}
            customerName={customerName}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            sameAsRecipient={isHomestay ? isSelfBooking : sameAsRecipient}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerEmailChange={setCustomerEmail}
            onSameAsRecipientChange={isHomestay ? setIsSelfBooking : setSameAsRecipient}
            rememberBuyer={rememberBuyer}
            onRememberBuyerChange={setRememberBuyer}
            {...(isHomestay
              ? { sameAsRecipientLabel: "Tôi là người nhận phòng", sameAsRecipientHint: "Dùng họ tên và số điện thoại ở trên để nhận phòng." }
              : {})}
          />
        </SpotlightBlock>

        <SpotlightBlock step={3} {...blockError(3)} title={isHomestay ? "Thông tin đặt phòng" : "Giao hàng"}>
        {isHomestay ? (
          <HomestayOrderFields
            showSpecialRequests={false}
            showSelfToggle={false}
            idPrefix={uid}
            inputClassName={INPUT}
            checkInDate={deliveryDate}
            checkOutDate={checkOutDate}
            minDate={minDate}
            maxDate={maxDate}
            checkInTimeSlot={deliveryTimeSlot}
            customerName={customerName}
            customerPhone={customerPhone}
            recipientName={recipientName}
            recipientPhone={recipientPhone}
            isSelfBooking={isSelfBooking}
            adultsCount={adultsCount}
            childrenCount={childrenCount}
            transitMethod={transitMethod}
            specialRequests={specialRequests}
            homestayAddress={undefined}
            homestayName={terms.sampleProduct}
            onCheckInChange={(d) => {
              setDeliveryDate(d)
              const n = calculateNights(d, checkOutDate)
              pricing.update({ quantity: n })
            }}
            onCheckOutChange={(d) => {
              setCheckOutDate(d)
              const n = calculateNights(deliveryDate, d)
              pricing.update({ quantity: n })
            }}
            onTimeSlotChange={setDeliveryTimeSlot}
            onRecipientNameChange={setRecipientName}
            onRecipientPhoneChange={setRecipientPhone}
            onSelfBookingToggle={setIsSelfBooking}
            onAdultsChange={setAdultsCount}
            onChildrenChange={setChildrenCount}
            onTransitChange={setTransitMethod}
            onSpecialRequestsChange={setSpecialRequests}
            availability={availability}
          />
        ) : (
          <StandardOrderFields
            idPrefix={uid}
            inputClassName={INPUT}
            industryKey={industryKey}
            recipientName={recipientName}
            recipientPhone={recipientPhone}
            deliveryDate={deliveryDate}
            deliveryTimeSlot={deliveryTimeSlot}
            minDate={minDate}
            maxDate={maxDate}
            shipping={shipping}
            fullSlots={pricing.fullSlots}
            addressParts={addressParts}
            hideRecipient={buyerIsRecipient}
            availability={availability}
            onRecipientNameChange={setRecipientName}
            onRecipientPhoneChange={setRecipientPhone}
            onDeliveryDateChange={setDeliveryDate}
            onDeliveryTimeSlotChange={setDeliveryTimeSlot}
            onAddressPartsChange={setAddressParts}
          />
        )}
        </SpotlightBlock>

        <SpotlightBlock step={4} {...blockError(4)} title="Ghi chú">
          <CompactOrderNotes
            idPrefix={uid}
            inputClassName={INPUT}
            industryKey={industryKey}
            values={isHomestay ? { specialRequests } : { cardMessage, senderNote, deliveryNote, mapUrl }}
            onChange={(kind, value) =>
              kind === "specialRequests" ? setSpecialRequests(value) : setNotes({ [kind]: value })
            }
          />
        </SpotlightBlock>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || availability.available === false}
          className="mt-2 w-full h-12 bg-primary hover:bg-primary-dark text-white font-extrabold text-body flex items-center justify-center gap-2 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} aria-hidden="true" />
          <span>
            {loading
              ? "Đang gửi đơn..."
              : availability.available === false
              ? (availability.message || "Tạm không khả dụng")
              : isHomestay
              ? "Xem lại thông tin đặt phòng"
              : "Xem lại đơn"}
          </span>
        </Button>
      </form>
      </OrderFocusProvider>
    </div>
  )
}
