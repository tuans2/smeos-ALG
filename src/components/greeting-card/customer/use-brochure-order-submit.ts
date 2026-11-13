"use client"

import { useState } from "react"
import { composeAddress, validateAddressParts } from "@/modules/greeting-card/domain/delivery-address"
import { deliveryScheduleError } from "@/modules/greeting-card/domain/delivery-schedule"
import { customerChoosesPromotion, PROMOTION_CHOICE_MISSING } from "@/modules/greeting-card/domain/order-policies"
import { validateCustomerOrderInput } from "@/modules/greeting-card/domain/greeting-card-rules"
import type { CustomerOrderSubmitInput } from "@/modules/greeting-card/domain/greeting-card-types"
import type { PublicAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"
import type { ShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import { calculateNights } from "./homestay-order-fields"

interface UseBrochureOrderSubmitParams {
  isHomestay: boolean
  industryKey?: string | null | undefined
  customerName: string
  customerPhone: string
  customerEmail: string
  recipientName: string
  recipientPhone: string
  deliveryDate: string
  deliveryTimeSlot: string
  addressParts: { houseNumber: string; street: string; ward: string; district?: string | undefined; province: string }
  cardMessage: string
  senderNote: string
  deliveryNote: string
  mapUrl: string
  website: string
  checkOutDate: string
  isSelfBooking: boolean
  adultsCount: number
  childrenCount: number
  transitMethod: string
  specialRequests: string
  selectedPromotionId: string
  appliedPolicies?: PublicAppliedPolicies | null | undefined
  shipping: ShippingConfig
  pricingSelection: {
    quantity: number
    variantId?: string | undefined
    shippingZoneId?: string | undefined
    voucherCode?: string | undefined
    paymentCode?: string | undefined
  }
  pricingErrors: Record<string, string>
  onSetReview: (data: CustomerOrderSubmitInput) => void
  onSubmit: (input: CustomerOrderSubmitInput) => Promise<void>
  onClearDraft: () => void
  onClearReview: () => void
}

export function useBrochureOrderSubmit(params: UseBrochureOrderSubmitParams) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Trường gây lỗi + số lần bấm gửi → form đưa Spotlight tới đúng khối, kể cả khi lỗi lặp lại
  const [errorField, setErrorField] = useState<{ field: string; attempt: number } | null>(null)
  const fail = (field: string, message: string) => {
    setErrorMessage(message)
    setErrorField((prev) => ({ field, attempt: (prev?.attempt ?? 0) + 1 }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setErrorField(null)

    if (params.isHomestay) {
      if (!params.customerName.trim()) {
        fail("customerName", "Vui lòng nhập họ tên người đặt phòng")
        return
      }
      if (!params.customerPhone.trim()) {
        fail("customerPhone", "Vui lòng nhập số điện thoại người đặt phòng")
        return
      }
      if (!params.deliveryDate) {
        fail("deliveryDate", "Vui lòng chọn ngày nhận phòng (Check-in)")
        return
      }
      if (!params.checkOutDate) {
        fail("checkOutDate", "Vui lòng chọn ngày trả phòng (Check-out)")
        return
      }
      if (params.checkOutDate <= params.deliveryDate) {
        fail("checkOutDate", "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm")
        return
      }
      if (!params.isSelfBooking && (!params.recipientName.trim() || !params.recipientPhone.trim())) {
        fail("recipientName", "Vui lòng nhập họ tên và số điện thoại người nhận phòng")
        return
      }
      if (params.appliedPolicies && customerChoosesPromotion(params.appliedPolicies) && !params.selectedPromotionId) {
        fail("selectedPromotionId", PROMOTION_CHOICE_MISSING)
        return
      }

      const nights = calculateNights(params.deliveryDate, params.checkOutDate)
      const effectiveRecipientName = params.isSelfBooking ? params.customerName : params.recipientName
      const effectiveRecipientPhone = params.isSelfBooking ? params.customerPhone : params.recipientPhone
      const effectiveAddress = `Lưu trú tại cơ sở (${params.transitMethod ? `Phương tiện: ${params.transitMethod}` : "Tự túc phương tiện"})`
      const combinedNote = [
        `Khách: ${params.adultsCount} người lớn${params.childrenCount > 0 ? `, ${params.childrenCount} trẻ em` : ""}`,
        `Lưu trú: ${nights} đêm (${params.deliveryDate} ➔ ${params.checkOutDate})`,
        params.transitMethod ? `Phương tiện: ${params.transitMethod}` : null,
        params.specialRequests ? `Yêu cầu: ${params.specialRequests}` : null,
      ]
        .filter(Boolean)
        .join(" | ")

      window.scrollTo({ top: 0 })
      params.onSetReview({
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail.trim() || undefined,
        recipientName: effectiveRecipientName,
        recipientPhone: effectiveRecipientPhone,
        deliveryDate: params.deliveryDate,
        checkOutDate: params.checkOutDate,
        deliveryTimeSlot: params.deliveryTimeSlot?.trim() || "14:00 - 16:00 (Tiêu chuẩn)",
        deliveryAddress: effectiveAddress,
        senderNote: combinedNote,
        quantity: nights,
        selectedPromotionId: params.selectedPromotionId || undefined,
        website: params.website,
        ...(params.pricingSelection.variantId ? { variantId: params.pricingSelection.variantId } : {}),
        ...(params.pricingSelection.voucherCode ? { voucherCode: params.pricingSelection.voucherCode } : {}),
        ...(params.pricingSelection.paymentCode && !params.pricingErrors.paymentCode
          ? { paymentCode: params.pricingSelection.paymentCode }
          : {}),
      })
      return
    }

    const deliveryAddress = composeAddress(params.addressParts)
    const check = validateCustomerOrderInput(
      {
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        recipientName: params.recipientName,
        recipientPhone: params.recipientPhone,
        deliveryDate: params.deliveryDate,
        deliveryTimeSlot: params.deliveryTimeSlot,
        deliveryAddress,
        cardMessage: params.cardMessage,
        senderNote: params.senderNote,
        deliveryNote: params.deliveryNote,
        mapUrl: params.mapUrl,
      },
      new Date(),
      params.industryKey
    )
    const scheduleError = !params.deliveryDate
      ? null
      : params.deliveryTimeSlot.trim()
      ? deliveryScheduleError(params.deliveryDate, params.deliveryTimeSlot, params.shipping)
      : "Vui lòng chọn khung giờ giao nhận"
    if (scheduleError) {
      check.errors.deliveryDate = scheduleError
      check.valid = false
    }
    const addressErrors = validateAddressParts(params.addressParts)
    if (Object.keys(addressErrors).length > 0) {
      delete check.errors.deliveryAddress
      Object.assign(check.errors, addressErrors)
      check.valid = false
    }
    if (params.appliedPolicies && customerChoosesPromotion(params.appliedPolicies) && !params.selectedPromotionId) {
      check.errors.selectedPromotionId = PROMOTION_CHOICE_MISSING
      check.valid = false
    }
    if (params.shipping.zones.length > 0 && !params.pricingSelection.shippingZoneId) {
      check.errors.shippingZoneId = "Vui lòng chọn khu vực giao hàng"
      check.valid = false
    }
    if (!check.valid) {
      const [field, message] = Object.entries(check.errors)[0] ?? ["", "Thông tin đặt hàng chưa hợp lệ"]
      fail(field, message ?? "Thông tin đặt hàng chưa hợp lệ")
      return
    }

    window.scrollTo({ top: 0 })
    params.onSetReview({
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail.trim() || undefined,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      deliveryDate: params.deliveryDate,
      deliveryTimeSlot: params.deliveryTimeSlot,
      deliveryAddress,
      addressParts: params.addressParts,
      cardMessage: params.cardMessage,
      senderNote: params.senderNote,
      deliveryNote: params.deliveryNote,
      mapUrl: params.mapUrl,
      website: params.website,
      quantity: params.pricingSelection.quantity,
      selectedPromotionId: params.selectedPromotionId || undefined,
      ...(params.pricingSelection.variantId ? { variantId: params.pricingSelection.variantId } : {}),
      ...(params.pricingSelection.shippingZoneId ? { shippingZoneId: params.pricingSelection.shippingZoneId } : {}),
      ...(params.pricingSelection.voucherCode ? { voucherCode: params.pricingSelection.voucherCode } : {}),
      ...(params.pricingSelection.paymentCode && !params.pricingErrors.paymentCode
        ? { paymentCode: params.pricingSelection.paymentCode }
        : {}),
    })
  }

  async function handleConfirm(review: CustomerOrderSubmitInput | null, confirmedTerms: boolean) {
    if (!review) return
    setErrorMessage(null)
    setLoading(true)
    try {
      await params.onSubmit({ ...review, confirmedTerms })
      params.onClearDraft()
      params.onClearReview()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi gửi đơn")
    } finally {
      setLoading(false)
    }
  }

  return {
    errorMessage,
    errorField,
    loading,
    setErrorMessage,
    handleSubmit,
    handleConfirm,
  }
}
