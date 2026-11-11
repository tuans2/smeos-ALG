"use client"

import { Disclosure } from "@/components/ui/disclosure"
import { ReorderButton } from "./reorder-button"
import { ShopContactBar } from "./shop-contact-bar"
import { useOrderFamily } from "./use-order-family"
import { OrderHistorySheet } from "./order-history-sheet"
import { showOrderHistory } from "@/modules/greeting-card/domain/order-family"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { CustomerJourneyContext, copyThenOpen, type CustomerJourney } from "./journey-context"
import { useJourneyTracker } from "./use-journey-tracker"
import { useStepHistory } from "./use-step-history"
import { useRememberedStep } from "./use-remembered-step"
import { canEnterCustomerStep, canViewTracking, resumeCustomerStep, type CustomerStep } from "@/modules/greeting-card/domain/customer-step"
import { updateSavedState } from "./use-saved-state"
import { JOURNEY_STATE_NAME } from "./templates/swipe/use-swipe-journey"
import { productInquiryMessage } from "@/modules/greeting-card/domain/collection-browse"
import { SOLD_OUT_MESSAGE } from "@/modules/greeting-card/domain/product-availability"
import type { CollectionSession } from "@/modules/greeting-card/domain/collection-session"
import { GreetingTemplateRenderer } from "./templates/greeting-template-renderer"
import type { OptionalDisplayField } from "@/modules/greeting-card/domain/display-fields"
import { BrochureOrderForm } from "./brochure-order-form"
import { ProductContactActions } from "./product-contact-actions"
import { ContactProductSheet } from "./contact-product-sheet"
import { BrochurePaymentView } from "./brochure-payment-view"
import { BrochureTrackingView } from "./brochure-tracking-view"
import { readApiError } from "@/components/greeting-card/api-error"
import type {
  BrochurePaymentInstructions,
  GreetingCatalogProduct,
  ProductSnapshot,
  CustomerOrderSubmitInput,
} from "@/modules/greeting-card/domain/greeting-card-types"
import type { CustomerBrochureView } from "@/modules/greeting-card/use-cases/get-greeting-catalog"

interface BrochureCustomerExperienceProps {
  initialData: CustomerBrochureView
  /** Nhân viên của tiệm mở xem trước: không ghi sự kiện, không chiếm phiên của khách */
  preview?: boolean | undefined
}


interface OrderState {
  orderCode: string
  totalVnd: number
  vietQr: BrochurePaymentInstructions | null
}

export function BrochureCustomerExperience({ initialData, preview = false }: BrochureCustomerExperienceProps) {
  const { session, catalog, products, shop } = initialData

  // Determine initial step based on session status
  const [step, setStep] = useState<CustomerStep>(() => {
    if (initialData.order) {
      const triggerPolicy = initialData.trackingTriggerPolicy ?? "PAYMENT_OR_COORDINATOR"
      const isAccepted =
        initialData.order.status === "CONFIRMED" ||
        initialData.order.status === "PROCESSING" ||
        (Boolean(initialData.order.productionStatus) && initialData.order.productionStatus !== "WAITING")
      const paid = initialData.order.totalVnd > 0 && initialData.order.paidVnd > 0
      const canTrigger = triggerPolicy === "PAYMENT_ONLY" ? paid : paid || isAccepted
      return canTrigger || initialData.order.status === "CANCELLED" ? "TRACKING" : "PAYMENT"
    }
    if (session.status === "SELECTED" && session.productSnapshot) return "ORDER_FORM"
    return "SWIPING"
  })

  // "Khách đã mở" được ghi khi trình duyệt nhận chủ phiên (`/claim`) — máy quét xem trước không chạy tới.
  const track = useJourneyTracker(session.sendCode, !preview)
  // Đã "Đặt thêm đơn": mở lại link cũ thì về đúng đơn đang làm dở; có nút Lịch sử đơn hàng
  const family = useOrderFamily(session.sendCode, !preview)
  const [currentProduct, setCurrentProduct] = useState<GreetingCatalogProduct | null>(null)
  const [contactNote, setContactNote] = useState<string | null>(null)
  // Hết hạn thanh toán, đơn tự huỷ → đổi nút dưới thành "Đặt lại đơn mới"
  const [paymentFailed, setPaymentFailed] = useState(false)
  const onPaymentFailed = useCallback(() => setPaymentFailed(true), [])

  const contactZalo = useCallback(
    (message: string, productId?: string) => {
      if (!shop.zaloUrl) return
      track("contact_zalo_clicked", productId)
      void copyThenOpen(shop.zaloUrl, message).then((copied) =>
        setContactNote(copied ? "Đã chép sẵn tin nhắn — dán vào Zalo để gửi cửa hàng." : null)
      )
    },
    [shop.zaloUrl, track]
  )
  const journey = useMemo<CustomerJourney>(
    () => ({ shop, track, onCurrentProductChange: setCurrentProduct, contactZalo }),
    [shop, track, contactZalo]
  )

  // Ảnh chụp mẫu do SERVER dựng (giá thật từ Product Master) — client không tự ghép giá.
  const [snapshot, setSnapshot] = useState<ProductSnapshot | null>(session.productSnapshot)
  const [selectError, setSelectError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [contactProduct, setContactProduct] = useState<GreetingCatalogProduct | null>(null)
  const inquiryUrl = `/api/v1/public/brochure/${session.sendCode}/inquiry`
  // Công tắc chủ cửa hàng: tắt Đặt hàng → mẫu nào cũng mở khung liên hệ; bật Liên hệ → nút "Nhắn tin"
  const entry = initialData.entryActions ?? { order: true, contact: false }

  // Hướng dẫn chuyển khoản luôn lấy từ server theo cấu hình của tiệm.
  const [orderResult, setOrderResult] = useState<OrderState | null>(() =>
    initialData.order
      ? { orderCode: initialData.order.code, totalVnd: initialData.order.totalVnd, vietQr: initialData.payment }
      : null
  )

  // Chưa chuyển khoản/chưa nhận đơn thì không vào Theo dõi; màn thanh toán chỉ hiện nút Theo dõi khi đã được phép
  const [trackingUnlocked, setTrackingUnlocked] = useState(() => {
    const order = initialData.order
    return !!order && canViewTracking({
      totalVnd: order.totalVnd,
      paidVnd: order.paidVnd,
      hasPaymentQr: !!initialData.payment,
      cancelled: order.status === "CANCELLED",
      orderStatus: order.status,
      productionStatus: order.productionStatus,
      triggerPolicy: initialData.trackingTriggerPolicy,
    })
  })

  // Back/Forward của trình duyệt đi giữa các bước; đơn đã gửi thì không quay lại form/lướt mẫu
  const stepFacts = { hasOrder: !!orderResult, hasSnapshot: !!snapshot, trackingUnlocked }
  useStepHistory(step, setStep, (target) => canEnterCustomerStep(target, stepFacts))
  // Rời trang rồi mở lại → về đúng bước đang đứng (vd. đã chọn mẫu nhưng quay lại xem mẫu khác thì
  // không bị ép vào form). Đơn đã trả đủ / đã huỷ thì luôn ở Theo dõi.
  useRememberedStep("customer-step", step, setStep, (saved) => resumeCustomerStep(saved, { ...stepFacts, serverStep: step }))

  // Khách rời trang khi đang điền đơn → bỏ dở đặt hàng (ghi một lần)
  useEffect(() => {
    if (step !== "ORDER_FORM") return
    track("checkout_started", snapshot?.id)
    const onHide = () => document.visibilityState === "hidden" && track("checkout_abandoned", snapshot?.id)
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
  }, [step, snapshot?.id, track])

  async function handleSelectProduct(product: GreetingCatalogProduct) {
    if (selecting) return
    if (product.available === false) {
      setSelectError(SOLD_OUT_MESSAGE)
      return
    }
    // Mẫu "Liên hệ" hoặc cửa hàng tắt Đặt hàng: không chọn để đặt, mở khung Gọi / Zalo / Nhắn tin
    if (product.priceMode === "CONTACT" || !entry.order) {
      setContactProduct(product)
      return
    }
    track("order_started", product.id)
    setSelectError(null)
    setSelecting(true)
    try {
      const res = await fetch(`/api/v1/public/brochure/${session.sendCode}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      })
      if (!res.ok) {
        setSelectError(await readApiError(res, "Không chọn được mẫu này, vui lòng thử lại"))
        return
      }
      const data = (await res.json()) as { snapshot: ProductSnapshot }
      setSnapshot(data.snapshot)
      setStep("ORDER_FORM")
    } catch {
      setSelectError("Mất kết nối mạng, vui lòng thử lại")
    } finally {
      setSelecting(false)
    }
  }

  async function handleSubmitOrder(input: CustomerOrderSubmitInput) {
    const res = await fetch(`/api/v1/public/brochure/${session.sendCode}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      throw new Error(await readApiError(res, "Không thể gửi đơn đặt hoa"))
    }

    const data = (await res.json()) as OrderState & { orderId?: string }
    setOrderResult({ orderCode: data.orderCode, totalVnd: data.totalVnd, vietQr: data.vietQr })
    // Gắn mã đơn vào phiên lướt mẫu trên máy: mở lại link không hỏi "tiếp tục xem" nữa
    updateSavedState<CollectionSession>(JOURNEY_STATE_NAME, (s) => ({ ...s, orderId: data.orderId ?? null }))
    setStep("PAYMENT")
  }

  // Máy chủ nhớ khách đã báo chuyển khoản: rời trang rồi quay lại vẫn thấy "đang chờ xác nhận"
  const [reportedPaid, setReportedPaid] = useState(session.status === "PAYMENT_REPORTED")
  async function handleReportPaid(proofAssetId?: string) {
    const res = await fetch(`/api/v1/public/brochure/${session.sendCode}/payment-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofAssetId }),
    })
    if (!res.ok) throw new Error(await readApiError(res, "Không gửi được thông báo, vui lòng thử lại"))
    setReportedPaid(true)
  }

  return (
    <CustomerJourneyContext.Provider value={preview ? null : journey}>
    <ShopContactBar
      shop={shop}
      inquiry={
        preview
          ? undefined
          : {
              onZalo: () =>
                contactZalo(
                  currentProduct && step === "SWIPING"
                    ? productInquiryMessage(currentProduct)
                    : snapshot
                      ? productInquiryMessage(snapshot)
                      : `Tôi đang xem bộ sưu tập "${catalog.name}" và cần cửa hàng tư vấn.`,
                  currentProduct?.id
                ),
              onCall: () => track("contact_call_clicked", currentProduct?.id),
              onMessage: entry.contact && currentProduct ? () => setContactProduct(currentProduct) : undefined,
            }
      }
    />
    {preview && (
      <p className="bg-warning-bg px-4 py-2 text-center text-body-sm text-warning-text">
        Bạn đang xem trước link của khách — thao tác ở đây không được lưu cho khách.
      </p>
    )}
    {family.redirecting && (
      <p role="status" className="bg-surface-muted px-4 py-2 text-center text-body-sm text-text">
        Đang mở đơn bạn đang làm dở…
      </p>
    )}
    {!family.redirecting && showOrderHistory(family.members) && (
      <OrderHistorySheet members={family.members} currentSendCode={session.sendCode} />
    )}
    {contactNote && (
      <p role="status" className="bg-surface-muted px-4 py-2 text-center text-body-sm text-text">
        {contactNote}
      </p>
    )}
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="w-full max-w-md mx-auto mb-6 flex flex-col items-center">

        {step === "SWIPING" && (
          <>
            {selectError && (
              <div role="alert" className="w-full mb-3 p-3 rounded-xl bg-danger-bg text-danger text-body-sm font-medium">
                {selectError}
                {shop.phone && <span className="block mt-1">Liên hệ cửa hàng: {shop.phone}</span>}
              </div>
            )}
            <GreetingTemplateRenderer
              showTemplateSwitcher={false}
              templateId={(catalog.filters as Record<string, unknown> | null | undefined)?.templateId as string | undefined}
              displayFields={(catalog.filters as Record<string, unknown> | null | undefined)?.displayFields as OptionalDisplayField[] | undefined}
              products={products}
              catalogName={catalog.name}
              selectedProductId={snapshot?.id || session.selectedProductId || null}
              initialCustomerName={session.customerName}
              appliedPolicies={
                (catalog.filters as Record<string, unknown> | null | undefined)?.appliedPolicies as
                  | import("@/modules/greeting-card/domain/store-policy").PublicAppliedPolicies
                  | undefined
              }
              onSelectProduct={handleSelectProduct}
            />
          </>
        )}

        {step === "ORDER_FORM" && snapshot && products.find((p) => p.id === snapshot.id)?.priceMode === "RANGE" && (
          <Disclosure label="Muốn phiên bản theo ý bạn? Nhắn cửa hàng" className="mx-auto mt-3 w-full max-w-md">
            <div className="mt-2">
              <ProductContactActions shop={shop} inquiryUrl={inquiryUrl} product={{ id: snapshot.id, name: snapshot.name }} />
            </div>
          </Disclosure>
        )}

        {step === "ORDER_FORM" && snapshot && (
          <BrochureOrderForm
            productSnapshot={snapshot}
            variants={products.find((p) => p.id === snapshot.id)?.variants ?? []}
            priceDimensions={products.find((p) => p.id === snapshot.id)?.priceDimensions}
            shipping={initialData.shipping}
            appliedPolicies={
              (catalog.filters as Record<string, unknown> | null | undefined)?.appliedPolicies as
                | import("@/modules/greeting-card/domain/store-policy").PublicAppliedPolicies
                | undefined
            }
            quoteUrl={`/api/v1/public/brochure/${session.sendCode}/quote`}
            industryKey={shop.industry}
            onBack={() => setStep("SWIPING")}
            onSubmit={handleSubmitOrder}
          />
        )}

        {contactProduct && (
          <ContactProductSheet product={contactProduct} shop={shop} inquiryUrl={inquiryUrl} priceOnRequest={contactProduct.priceMode === "CONTACT"} onClose={() => setContactProduct(null)} />
        )}

        {step === "PAYMENT" && orderResult && (
          <BrochurePaymentView
            orderCode={orderResult.orderCode}
            sendCode={session.sendCode}
            totalVnd={orderResult.totalVnd}
            vietQr={orderResult.vietQr}
            shopPhone={shop.phone}
            internationalGuide={shop.languagePolicy?.internationalPaymentGuide}
            onReportPaid={handleReportPaid}
            alreadyReported={reportedPaid}
            requirePaymentProof={
              (catalog.filters as Record<string, unknown> | null | undefined)?.requirePaymentProof !== false
            }
            triggerPolicy={initialData.trackingTriggerPolicy}
            onGoToTracking={() => {
              setTrackingUnlocked(true)
              setStep("TRACKING")
            }}
            onPaymentFailed={onPaymentFailed}
          />
        )}

        {step === "TRACKING" && orderResult && (
          <BrochureTrackingView orderCode={orderResult.orderCode} sendCode={session.sendCode} onPaymentFailed={onPaymentFailed} />
        )}

        {(step === "PAYMENT" || step === "TRACKING") && orderResult && (
          // Đơn không hoàn thành (thanh toán thất bại) → nút chính kêu gọi đặt lại ngay dưới thông báo
          <ReorderButton sendCode={session.sendCode} {...(paymentFailed ? { label: "Đặt lại đơn mới", primary: true } : {})} />
        )}
      </div>

      <footer className="text-center text-caption text-text-muted mt-8">
        Đặt hàng trực tuyến · Vận hành bởi smeOS
      </footer>
    </div>
    </CustomerJourneyContext.Provider>
  )
}
