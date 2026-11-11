"use client"

import { MediaGallery } from "@/components/greeting-card/media-gallery"
import React, { useEffect, useState } from "react"
import useSWR from "swr"
import { apiGet, apiSend } from "@/components/greeting-card/greeting-api"
import { TrackingVerifyForm } from "./tracking-verify-form"
import { CheckCircle2, Clock, Camera, RefreshCw } from "@/components/ui/icons"
import { TrackingSteps } from "./tracking-steps"
import { OrderChangePanel, type OrderChangeData } from "./order-change-panel"
import { TrackingPaymentCard, type TrackingPayment } from "./tracking-payment-card"
import { PaymentFailedNotice } from "./payment-failed-notice"
import { OrderCancelledNotice, type CancellationNoticeData } from "./order-cancelled-notice"
import { OrderProposalsPanel, type FlowerSubstituteData, type SubstituteData } from "./order-proposals-panel"
import { CustomerThankYouCard, THANK_YOU_TARGET, type ThankYouVoucherData } from "./customer-thank-you-card"
import { isTrackingCompleted } from "@/modules/greeting-card/domain/greeting-card-rules"
import { Button } from "@/components/ui/button"
import { OrderParallelStagesCard } from "./order-parallel-stages-card"
import { BalancePaymentBanner } from "./balance-payment-banner"
import { PhotoApprovalCard } from "./photo-approval-card"
import { HomestayBookingSuccessCard } from "./homestay-booking-success-card"
import { getIndustryTerminology, getIndustryOrderTerms, getIndustryFulfillmentFlow } from "@/modules/organization/domain/industry-profile"

interface BrochureTrackingViewProps {
  orderCode: string
  /** Mã link của chính khách — có thì máy chủ trả bản đầy đủ, không cần nhập SĐT. */
  sendCode?: string | null | undefined
  /** Nút "Đặt lại đơn mới" khi đơn không hoàn thành vì thanh toán thất bại. */
  failedCta?: React.ReactNode
  onPaymentFailed?: (() => void) | undefined
}

type TrackingData = {
  status: "FOUND" | "NOT_FOUND"
  order: {
    code: string
    status: string
    productionStatus: string
    deliveryStatus: string
    totalVnd: number
    paidVnd: number
    /** Kế hoạch + các đợt thanh toán (máy chủ mới; client cũ có thể thiếu) */
    payment?: TrackingPayment
    cardMessage?: string | null
    /** `false` = bản rút gọn cho người chỉ biết mã đơn */
    verified?: boolean
    /** Chỉ khi đã xác minh: đổi thông tin đơn + lịch sử */
    change?: OrderChangeData | null
    /** Chỉ khi đã xác minh: tiệm đề xuất mẫu thay thế / đổi một loại hoa phụ */
    substitute?: SubstituteData | null; flowerSubstitute?: FlowerSubstituteData | null
    /** Lần giao gần nhất không thành công (ghi chú chỉ khi đã xác minh) */
    deliveryFailure?: { at: string; reasonLabel: string; note: string | null; feeVnd: number; attempts: number } | null
    /** Tiệm không thực hiện được đơn (Điều phối huỷ, đã duyệt): hạn liên hệ + tiền hoàn */
    cancellationNotice?: CancellationNoticeData | null
    thankYouVoucher?: ThankYouVoucherData | null
    recipientName: string
    deliveryAddress: string
    deliveryDate?: string | null
    deliveryTimeSlot?: string | null
    checkOutDate?: string | null
    customerReportedPayment?: boolean
    productSnapshot?: { name?: string; imageUrl?: string | null } | null
    finishedImageUrl?: string | null
    productPhotoUrls?: string[]
    recipientPhotoUrls?: string[]
    photoApproval?: {
      status: "NONE" | "PENDING" | "APPROVED" | "AUTO_APPROVED"
      uploadedAt: string | null
      countdownMinutes: number
      approvedAt: string | null
    }
    industryKey?: string | null | undefined
    createdAt: string
    bypassNotices?: {
      qc?: string | null
      shipper?: string | null
      pod?: string | null
    } | null
    timeline?: {
      arranging?: { displayRange: string }
      readyQc?: { displayRange: string }
      delivering?: { displayRange: string }
    } | null
  }
  trackingStep: {
    stepIndex: number
    title: string
    description: string
    percentage: number
  }
}

export function BrochureTrackingView({ orderCode, sendCode, failedCta, onPaymentFailed }: BrochureTrackingViewProps) {
  const base = `/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}`
  // Đã xác minh bằng 4 số cuối SĐT: hỏi bằng POST, không tự hỏi lại (máy chủ giới hạn số lần thử)
  const [last4, setLast4] = useState<string | null>(null)
  const key = last4 ? [base, last4] : `${base}${sendCode ? `?link=${encodeURIComponent(sendCode)}` : ""}`
  const tracking = useSWR<TrackingData>(
    key,
    (k: string | string[]) => (Array.isArray(k) ? apiSend<TrackingData>(k[0]!, "POST", { phoneLast4: k[1] }) : apiGet<TrackingData>(k)),
    { refreshInterval: last4 ? 0 : 15_000 },
  )
  const data = tracking.data?.status === "FOUND" ? tracking.data : null
  const paymentFailed = data?.order.payment?.status === "PAYMENT_FAILED"
  useEffect(() => {
    if (paymentFailed) onPaymentFailed?.()
  }, [paymentFailed, onPaymentFailed])
  const loading = tracking.isLoading
  const loadTracking = () => void tracking.mutate()

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted">
        <RefreshCw size={32} className="animate-spin motion-reduce:animate-none text-primary mb-3" />
        <p className="text-body font-medium">Đang tải tiến trình đơn hoa của bạn...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p className="text-body">Không tìm thấy thông tin đơn hàng {orderCode}.</p>
      </div>
    )
  }

  const { order, trackingStep } = data
  const productPhotos = order.productPhotoUrls ?? (order.finishedImageUrl ? [order.finishedImageUrl] : [])
  const recipientPhotos = order.recipientPhotoUrls ?? []
  const awaitingQuote = order.totalVnd <= 0
  const isPaid = !awaitingQuote && order.paidVnd >= order.totalVnd
  const fulfillmentFlow = getIndustryFulfillmentFlow(order.industryKey)
  const isHomestayStay = fulfillmentFlow === "CALENDAR_STAY"
  const hasPaymentCommitment = isPaid || order.paidVnd > 0 || order.customerReportedPayment === true

  return (
    <div className="w-full max-w-xl lg:max-w-2xl mx-auto bg-surface rounded-2xl border border-border p-5 sm:p-7 shadow-sm flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
        <div className="min-w-0">
          <span className="text-caption font-bold uppercase tracking-wider text-primary">
            {isHomestayStay ? "Thông tin đặt phòng & Lưu trú" : "Theo dõi tiến độ Đơn hàng"}
          </span>
          <h2 className="text-title font-extrabold text-text">
            {isHomestayStay ? "Mã đặt phòng" : "Đơn hàng"} <span className="whitespace-nowrap">#{order.code}</span>
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadTracking}
          className="gap-1.5 text-caption h-8 shrink-0 whitespace-nowrap"
        >
          <RefreshCw size={13} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
          <span>Cập nhật</span>
        </Button>
      </div>

      {paymentFailed && <PaymentFailedNotice orderCode={order.code} cta={failedCta} />}
      {order.cancellationNotice && <OrderCancelledNotice orderCode={order.code} notice={order.cancellationNotice} />}

      {/* Đơn đã hoàn tất: lời cảm ơn + xem lại đơn, tiến độ, đặt đơn mới */}
      {!isHomestayStay && isTrackingCompleted(order.status, order.deliveryStatus) && <CustomerThankYouCard orderCode={order.code} sendCode={sendCode} voucher={order.thankYouVoucher} />}

      {/* HOMESTAY/LƯU TRÚ: Khi khách đã báo chuyển khoản hoặc thanh toán → Hiện Thẻ xác nhận đặt phòng & Khóa lịch hẹn */}
      {isHomestayStay && hasPaymentCommitment && !order.cancellationNotice && (
        <HomestayBookingSuccessCard order={order} isPaid={isPaid} />
      )}

      {/* Progress Bar & Current Status Card (Chỉ hiện cho luồng sản xuất chế tác/giao hàng hoặc Homestay chưa báo chuyển khoản) */}
      {!order.cancellationNotice && (!isHomestayStay || !hasPaymentCommitment) && <>
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-body font-extrabold text-primary">
            {trackingStep.title}
          </span>
          <span className="text-caption font-bold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full">
            {trackingStep.percentage}%
          </span>
        </div>

        <p className="text-body-sm text-text-muted">
          {trackingStep.description}
        </p>

        <TrackingSteps stepIndex={trackingStep.stepIndex} createdAt={order.createdAt} timeline={order.timeline} industryKey={order.industryKey} />
      </div>

      <OrderParallelStagesCard
        paidVnd={order.paidVnd}
        totalVnd={order.totalVnd}
        isPaid={isPaid}
        orderStatus={order.status}
        productionStatus={order.productionStatus}
        cancelledReason={order.status === "CANCELLED" ? "Cửa hàng không thể nhận đơn" : null}
        industryKey={order.industryKey}
      />
      </>}

      {!isHomestayStay && (
        <BalancePaymentBanner
          totalVnd={order.totalVnd}
          paidVnd={order.paidVnd}
          productionStatus={order.productionStatus}
          deliveryStatus={order.deliveryStatus}
          photoApprovalStatus={order.photoApproval?.status}
          hasProductPhotos={productPhotos.length > 0}
          onScrollToPayment={() => {
            document.getElementById("tracking-payment-title")?.scrollIntoView({ behavior: "smooth" })
          }}
        />
      )}

      {/* Ảnh thành phẩm và ảnh người nhận: hai mục riêng, chỉ hiện ở luồng sản xuất chế tác */}
      <div id={THANK_YOU_TARGET.progress} className="flex flex-col gap-4">
      {/* Thông báo trường hợp bất khả kháng được Điều phối duyệt bỏ qua ảnh QC */}
      {!isHomestayStay && productPhotos.length === 0 && order.bypassNotices?.qc && (
        <section className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-1.5 text-body-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-caption">
            <Camera size={15} />
            <span>Thông tin từ Cửa hàng</span>
          </div>
          <p className="text-text text-caption leading-relaxed">
            {order.bypassNotices.qc}
          </p>
        </section>
      )}

      {!isHomestayStay && productPhotos.length > 0 && (
        <section className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-muted border border-border">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-text font-extrabold text-body">
              <Camera size={18} className="text-primary" aria-hidden="true" />
              {getIndustryOrderTerms(order.industryKey).completedPhotoSectionTitle}
            </h3>
            {order.photoApproval?.status === "APPROVED" && (
              <span className="text-caption font-bold text-success bg-success/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Bạn đã xác nhận ảnh
              </span>
            )}
            {order.photoApproval?.status === "AUTO_APPROVED" && (
              <span className="text-caption font-bold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Tự động xác nhận
              </span>
            )}
          </div>

          <MediaGallery urls={productPhotos} label={getIndustryOrderTerms(order.industryKey).completedPhotoSectionTitle} />
          <p className="text-caption text-text-muted">Được chụp nghiệm thu trước khi giao.</p>

          {/* KHUNG XÁC NHẬN HÌNH ẢNH SẢN PHẨM & ĐỒNG HỒ ĐẾM NGƯỢC (SPEC #3) */}
          {sendCode && order.photoApproval?.status === "PENDING" && order.photoApproval.uploadedAt && (
            <PhotoApprovalCard
              orderCode={order.code}
              sendCode={sendCode}
              uploadedAt={order.photoApproval.uploadedAt}
              countdownMinutes={order.photoApproval.countdownMinutes}
              hasBalanceDue={!isPaid && order.paidVnd > 0}
              onApproved={() => {
                void loadTracking()
                if (!isPaid && order.paidVnd > 0) {
                  setTimeout(() => {
                    document.getElementById("tracking-payment-title")?.scrollIntoView({ behavior: "smooth" })
                  }, 400)
                }
              }}
            />
          )}
        </section>
      )}
      {recipientPhotos.length > 0 && (
        <section className="flex flex-col gap-2 p-4 rounded-2xl bg-surface-muted border border-border">
          <h3 className="flex items-center gap-2 text-text font-extrabold text-body">
            <Camera size={18} className="text-success" aria-hidden="true" />
            Ảnh {getIndustryOrderTerms(order.industryKey).recipientShortLabel}
          </h3>
          <MediaGallery urls={recipientPhotos} label={`Ảnh ${getIndustryOrderTerms(order.industryKey).recipientShortLabel}`} />
          <p className="text-caption text-text-muted">Đã được trao tận tay {getIndustryOrderTerms(order.industryKey).recipientShortLabel}.</p>
        </section>
      )}
      {recipientPhotos.length === 0 && order.bypassNotices?.pod && (
        <section className="p-4 rounded-2xl bg-success/10 border border-success/20 flex flex-col gap-1.5 text-body-sm">
          <div className="flex items-center gap-2 text-success font-bold text-caption">
            <CheckCircle2 size={15} />
            <span>Xác nhận giao hàng trực tiếp</span>
          </div>
          <p className="text-text text-caption leading-relaxed">
            {order.bypassNotices.pod}
          </p>
        </section>
      )}
      </div>

      {/* Thu trước giao: ẩn thẻ thanh toán lần 2 khi đang chờ khách duyệt ảnh (PO 09/10/2026) */}
      {order.payment && !paymentFailed && order.photoApproval?.status !== "PENDING" && (
        <TrackingPaymentCard payment={order.payment} sendCode={sendCode} industryKey={order.industryKey} />
      )}
      {order.verified === false && <TrackingVerifyForm orderCode={orderCode} onVerified={setLast4} />}
      {order.deliveryFailure && (
        <div role="status" className="rounded-2xl border border-warning/30 bg-warning-bg p-4 flex flex-col gap-1 text-body-sm">
          <p className="font-extrabold text-warning-text">Lần giao {order.deliveryFailure.attempts > 1 ? `thứ ${order.deliveryFailure.attempts} ` : ""}chưa thành công: {order.deliveryFailure.reasonLabel}</p>
          {order.deliveryFailure.note && <p className="text-text">Shipper ghi: {order.deliveryFailure.note}</p>}
          {order.deliveryFailure.feeVnd > 0 && <p className="text-text">Phí giao lại: {order.deliveryFailure.feeVnd.toLocaleString("vi-VN")}đ (đã cộng vào đơn).</p>}
          <p className="text-text-muted">
            {order.change ? "Cửa hàng sẽ liên hệ để hẹn giao lại. Bạn có thể đổi giờ, địa chỉ hoặc người nhận ngay bên dưới." : "Cửa hàng sẽ liên hệ để hẹn giao lại. Xác minh bằng 4 số cuối SĐT người đặt để đổi giờ hoặc địa chỉ giao."}
          </p>
        </div>
      )}
      {(order.substitute || order.flowerSubstitute) && (
        <OrderProposalsPanel orderCode={orderCode} proof={{ sendCode, last4 }} substitute={order.substitute ?? null} flower={order.flowerSubstitute ?? null} onChanged={loadTracking} />
      )}
      {order.change && (
        <OrderChangePanel orderCode={orderCode} proof={{ sendCode, last4 }} change={order.change} onChanged={loadTracking} />
      )}

      {/* Order Details Summary */}
      <div id={THANK_YOU_TARGET.details} className="flex flex-col gap-2 text-body-sm text-text-muted bg-surface-muted p-4 rounded-xl border border-border">
        <div className="flex justify-between gap-3">
          <span className="shrink-0">Người nhận:</span>
          <span className="font-bold text-text text-right break-words">{order.recipientName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="shrink-0">Địa chỉ giao:</span>
          <span className="min-w-0 font-bold text-text text-right break-words">
            {order.deliveryAddress}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Thanh toán:</span>
          <span className={`font-bold ${isPaid || order.paidVnd > 0 ? "text-success" : "text-warning-text"}`}>
            {awaitingQuote ? "Chờ cửa hàng báo giá" : isPaid ? "Đã thanh toán đủ" : order.paidVnd > 0 ? (order.payment?.balanceDue ? "Đã nhận cọc · Chờ thanh toán lần 2" : "Đã nhận tiền cọc") : "Chờ xác nhận chuyển khoản"}
          </span>
        </div>
        {order.cardMessage && (
          <div className="pt-2 border-t border-border mt-1">
            <span className="text-caption font-semibold text-text-muted block mb-0.5">
              Lời nhắn thiệp:
            </span>
            <p className="text-body-sm italic text-text border-l-2 border-primary/40 pl-3 py-0.5">
              &ldquo;{order.cardMessage}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

