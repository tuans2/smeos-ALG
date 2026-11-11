"use client"

import { Button } from "@/components/ui/button"
import { PhotoApprovalNote, photoWaitBlocker, type PhotoApprovalState } from "./photo-approval-note"
import React from "react"
import { MapPin, Calendar, CheckCircle2, ExternalLink } from "@/components/ui/icons"
import { coordinatorActionBlocker, type CoordinatorAction } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import { paymentGateBlocker, type BrochurePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { CoordinatorProgressStrip } from "./coordinator-progress-strip"
import { WorkStatus } from "@/components/greeting-card/work/work-status"
import type { TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import type { OrderProductView } from "@/modules/greeting-card/domain/order-product-view"
import { readDeliveryNote } from "@/modules/greeting-card/domain/delivery-note"
import { readDeliveryFailures } from "@/modules/greeting-card/domain/delivery-failure"
import { StaffNametagGroup } from "@/components/greeting-card/staff-nametag"
import { CoordinatorCardDecisionBlocks } from "./coordinator-card-decision-blocks"
import { CoordinatorCardActions } from "./coordinator-card-actions"
import { CoordinatorSubcontractActionsPanel } from "./coordinator-subcontract-actions-panel"
import { DEPOSIT_PENDING_APPROVAL_NOTE, isDepositPendingApproval } from "@/modules/greeting-card/domain/deposit-acknowledgement"
import {
  isUrgentOrder,
  type BrochureWorkflowPolicy,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms, type IndustryTerminology, type IndustryOrderTerminology } from "@/modules/organization/domain/industry-profile"


import { CoordinatorBypassReviewBanner, type StepBypassRecord } from "./coordinator-bypass-review-banner"

export interface BrochureOrder {
  id: string
  code: string
  status: string
  production_status: string
  delivery_status: string
  total_vnd: number
  paid_vnd: number
  card_message: string | null
  delivery_address: { recipientName?: string; phone?: string; street?: string; notes?: string; mapUrl?: string } | null
  delivery_window: { date?: string; timeSlot?: string; failures?: unknown } | null
  items: Array<{ id: string; description: string; quantity: number; unit_price_vnd: number; metadata?: { name?: string; imageUrl?: string; flowersSummary?: string | null } }>
  greeting_sessions: Array<{ id: string; send_code: string; product_snapshot?: { name?: string; imageUrl?: string; flowersSummary?: string | null }; status?: string; catalog?: { filters?: unknown } | null }>
  customer?: { id?: string; code?: string; name?: string; phone?: string } | null
  pricing_rule_ref?: { policies?: { promotion?: { title?: string } | null } | null } | null
  saleId?: string | null; saleName?: string | null; coordinatorId?: string | null; coordinatorName?: string | null
  payment_proof_url?: string | null; payment_proof_balance_url?: string | null; created_at: string
  /** Thông tin sản phẩm dựng sẵn ở server (SSOT) — chỉ đọc trường này để hiện mẫu. */
  product: OrderProductView
  /** Chờ khách duyệt ảnh thành phẩm trước khi giao ship */
  photo_approval?: PhotoApprovalState | null
  /**
   * Trạng thái Gate 2 chain dispatch (có khi đơn đang trong luồng gia công chuỗi).
   * Khi có trường này: hiển thị panel Coordinator-Stream actions.
   */
  gate2?: {
    claimedBranchId?: string | null
    hasQcPhoto?: boolean
    hasShipperInfo?: boolean
    hasDeliveryProof?: boolean
    shipperInfo?: { shipperName: string; shipperPhone: string; submittedAt: string } | null
    bypassRequests?: Record<string, StepBypassRecord> | null
  } | null
}

export type OrderDecisionFlow = "coordinator" | "admin"

export type ModalState =
  | { type: "none" }
  | { type: "florist"; orderId: string; orderCode: string }
  | { type: "product-photo"; orderId: string; orderCode: string }
  | { type: "dispatch"; orderId: string; orderCode: string }
  | { type: "recipient-photo"; orderId: string; orderCode: string }
  | { type: "delivery-failed"; orderId: string; orderCode: string }
  | { type: "substitute"; orderId: string; orderCode: string }
  /** "coordinator" → /accept · /reject (Điều phối nhận đơn) · "admin" → /confirm-order (Điều hành xác nhận đơn) */
  | { type: "accept-order"; orderId: string; orderCode: string; flow: OrderDecisionFlow; branchName?: string | null | undefined }
  | { type: "reject-order"; orderId: string; orderCode: string; flow: OrderDecisionFlow; branchName?: string | null | undefined }
  | { type: "cancel-proposal"; orderId: string; orderCode: string; totalVnd: number; paidVnd: number; deliveryStatus?: string }
  | { type: "confirm-balance"; orderId: string; orderCode: string; balanceVnd: number; proofUrl: string | null }
  | { type: "confirm-deposit"; orderId: string; orderCode: string; depositVnd: number | null; proofUrl: string | null }
  | { type: "detail"; order: BrochureOrder }

const DELIVERY_LABELS: Record<string, string> = {
  PENDING: "Chưa giao", DELIVERING: "Đang giao", DISPATCHED: "Đã bàn giao Ship",
  DELIVERED: "Giao thành công", FAILED: "Giao thất bại",
}

function productionLabel(s: string, terms?: IndustryTerminology) {
  if (terms) {
    if (s === "WAITING") return `Chờ ${terms.makerAction.toLowerCase()}`
    if (s === "ASSIGNED") return "Đã phân công"
    if (s === "ARRANGING") return `Đang ${terms.makerAction.toLowerCase()}`
    if (s === "QUALITY_CHECK") return "Đang kiểm tra"
    if (s === "READY") return `${terms.sampleProduct.replace(/ chuẩn$/i, "")} hoàn thiện`
    if (s === "DONE") return "Đã xong"
  }
  const fallback: Record<string, string> = {
    WAITING: "Chờ chế tác", ASSIGNED: "Đã phân công", ARRANGING: "Đang chế tác",
    QUALITY_CHECK: "Đang kiểm tra", READY: "Hoa đã hoàn thiện", DONE: "Đã xong",
  }
  return fallback[s] ?? s
}

function deliveryLabel(s: string, orderTerms?: IndustryOrderTerminology) {
  if (orderTerms?.fulfillmentFlow === "CALENDAR_STAY") {
    if (s === "PENDING") return "Chờ nhận phòng"
    if (s === "DELIVERING" || s === "DISPATCHED") return "Đang lưu trú"
    if (s === "DELIVERED") return "Đã trả phòng"
    if (s === "FAILED") return "Huỷ / Không đến"
  }
  return DELIVERY_LABELS[s] ?? s
}

export function CoordinatorOrderCard({
  order,
  policy,
  onOpen,
  work,
  now,
  workflowPolicy,
}: {
  order: BrochureOrder
  policy: BrochurePaymentPolicy
  onOpen: (m: ModalState) => void
  work?: TrackingPipelineItem | undefined
  now: number
  workflowPolicy?: BrochureWorkflowPolicy | undefined
}) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"

  const session = order.greeting_sessions[0]
  const { product } = order
  const recipient = order.delivery_address?.recipientName || (isStay ? "Khách lưu trú" : "Khách nhận")
  const phone = order.delivery_address?.phone || ""
  const address = order.delivery_address?.street || ""
  const delivery = readDeliveryNote(order.delivery_address)
  const failures = readDeliveryFailures(order.delivery_window)
  const lastFailure = order.delivery_status === "FAILED" ? failures.at(-1) : undefined
  const date = order.delivery_window?.date || ""
  const timeSlot = order.delivery_window?.timeSlot || orderTerms.fallbackTimeSlotText
  const awaitingQuote = order.total_vnd <= 0
  const isPaid = !awaitingQuote && order.paid_vnd >= order.total_vnd
  const isDeposit = !awaitingQuote && !isPaid && order.paid_vnd > 0
  const depositPending = isDepositPendingApproval({ status: order.status, productionStatus: order.production_status, totalVnd: order.total_vnd, paidVnd: order.paid_vnd, customerReported: session?.status === "PAYMENT_REPORTED" || Boolean(work?.paymentProofUrl) })
  const isDelivered = order.delivery_status === "DELIVERED" || order.status === "COMPLETED"

  const isUrgent = isUrgentOrder({ deliveryDate: order.delivery_window?.date, deliveryTimeSlot: order.delivery_window?.timeSlot })

  // Giao ship khi chưa qua bước ảnh: theo cài đặt ảnh QC của tiệm, khớp kiểm tra ở máy chủ
  const blockerOf = (action: CoordinatorAction) =>
    coordinatorActionBlocker(
      action,
      { status: order.status, productionStatus: order.production_status, deliveryStatus: order.delivery_status },
      { skipPhoto: policy.requireProductPhotoQC === false },
    ) ?? paymentGateBlocker(action, policy, { totalVnd: order.total_vnd, paidVnd: order.paid_vnd })
    ?? (action === "dispatch-shipping" ? photoWaitBlocker(order.photo_approval, now) : null)

  return (
    <div data-focus-key={order.id} className={`bg-surface rounded-2xl border p-5 shadow-sm flex flex-col gap-4 ${work?.stuck?.owner === "COORDINATOR" ? "border-danger/50" : "border-border"}`}>
      {work && <WorkStatus item={work} me="COORDINATOR" now={now} />}
      <PhotoApprovalNote approval={order.photo_approval} now={now} />
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost"
            type="button"
            onClick={() => onOpen({ type: "detail", order })}
            className="text-[length:inherit] h-auto p-0 justify-start font-[inherit] flex items-center gap-2 text-left group cursor-pointer"
          >
            <span className="text-title-sm font-extrabold text-text group-hover:text-primary transition-colors">
              #{order.code}
            </span>
            {session?.send_code && (
              <span className="text-caption px-2 py-0.5 rounded-md bg-surface-muted text-text-muted font-mono font-bold">
                {session.send_code}
              </span>
            )}
            {isUrgent && (
              <span className="text-caption px-2 py-0.5 rounded-md bg-danger-bg text-danger font-extrabold animate-pulse motion-reduce:animate-none">
                HỎA TỐC
              </span>
            )}
            <span className="text-caption text-primary underline font-medium ml-1">Xem chi tiết</span>
          </Button>
          <StaffNametagGroup
            item={work}
            fallbackSaleName={order.saleName}
            fallbackSaleId={order.saleId}
            fallbackCoordinatorName={order.coordinatorName}
            fallbackCoordinatorId={order.coordinatorId}
            forceStage="coordinator"
          />
        </div>
        <span className="text-body-sm font-extrabold text-primary">
          {order.total_vnd.toLocaleString("vi-VN")} đ
        </span>
      </div>

      {/* Product */}
      <div className="flex gap-3.5 items-start">
        <FlowerImage
          src={product.imageUrl}
          alt={product.name}
          sizes="80px"
          fallback="icon"
          className="w-20 h-20 rounded-xl border border-border shrink-0"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="text-caption text-text-muted font-medium">{terms.sampleProduct.replace(/ chuẩn$/i, "")} khách chọn:</div>
          <div className="text-body font-bold text-text truncate">
            {product.name}
          </div>
          <div className="flex flex-wrap gap-2 mt-0.5">
            <span className="text-caption px-2 py-0.5 rounded-full bg-surface-muted text-text-muted border border-border">
              SX: {productionLabel(order.production_status, terms)}
            </span>
            <span className="text-caption px-2 py-0.5 rounded-full bg-surface-muted text-text-muted border border-border">
              {isStay ? "Tiến độ: " : "Ship: "}{deliveryLabel(order.delivery_status, orderTerms)}
            </span>
          </div>
        </div>
      </div>

      <CoordinatorProgressStrip
        status={order.status}
        productionStatus={order.production_status}
        deliveryStatus={order.delivery_status}
      />

      {/* Logistics */}
      <div className="bg-surface-muted rounded-xl p-3 flex flex-col gap-2 text-body-sm text-text-muted">
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-body-sm font-extrabold text-primary">
          <Calendar size={16} className="text-primary shrink-0" />
          <span>{orderTerms.deliveryTimeLabel}: {timeSlot}{date ? ` · ${date}` : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-primary shrink-0" />
          <span className="truncate">{recipient} ({phone}) — {address}</span>
        </div>
        {(delivery.note || delivery.mapUrl) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text">
            {delivery.note && <span><span className="font-bold">{isStay ? "Quản gia lưu ý:" : "Người giao lưu ý:"}</span> {delivery.note}</span>}
            {delivery.mapUrl && (
              <a href={delivery.mapUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                <ExternalLink size={12} aria-hidden="true" /> Mở bản đồ
              </a>
            )}
          </div>
        )}
        {lastFailure && (
          <div role="status" className="rounded-lg bg-warning-bg px-2 py-1.5 text-caption text-warning-text">
            <span className="font-bold">Giao lần {failures.length} chưa thành công:</span> {lastFailure.reasonLabel}
            {lastFailure.note ? ` — ${lastFailure.note}` : ""}. Hẹn lại với khách rồi bấm &ldquo;Giao lại&rdquo;.
          </div>
        )}
        {order.card_message && (
          <div className="text-caption italic text-text border-t border-border pt-1.5 mt-0.5">
            Thiệp: &ldquo;{order.card_message}&rdquo;
          </div>
        )}
        {order.pricing_rule_ref?.policies?.promotion?.title && (
          <div className="text-caption font-bold text-success">Ưu đãi khách chọn: {order.pricing_rule_ref.policies.promotion.title}</div>
        )}
      </div>

      {/* Payment status */}
      <div className="flex items-center justify-between text-caption">
        <span className={isPaid ? "text-success font-bold" : isDeposit ? "text-warning-text font-bold" : "text-warning-text font-bold"}>
          {awaitingQuote ? "● Chờ báo giá" : isPaid ? "● Đã thanh toán đủ" : isDeposit ? "● Đã cọc (Chờ TT lần 2)" : depositPending ? `● ${DEPOSIT_PENDING_APPROVAL_NOTE}` : "● Chưa thu tiền"}
        </span>
        {isDelivered && (
          <span className="flex items-center gap-1 text-success font-bold">
            <CheckCircle2 size={13} /> Hoàn tất
          </span>
        )}
      </div>

      {/* Khối quyết định của Điều phối & Xác nhận/Nhắc thanh toán lần 2 */}
      <CoordinatorCardDecisionBlocks order={order} policy={policy} work={work} onOpen={onOpen} workflowPolicy={workflowPolicy} />

      {/* Yêu cầu Bỏ qua bằng chứng từ Chi nhánh đang chờ Điều phối duyệt */}
      {order.gate2?.bypassRequests && !isDelivered && (
        <CoordinatorBypassReviewBanner
          orderId={order.id}
          orderCode={order.code}
          bypassRequests={order.gate2.bypassRequests}
          onDecisionComplete={() => {
            window.dispatchEvent(new CustomEvent("coordinator:gate2:action", { detail: { orderId: order.id } }))
          }}
        />
      )}

      {/* Gate 2 Coordinator-Stream Panel: chỉ hiện khi có chain dispatch đang active */}
      {order.gate2?.claimedBranchId && !isDelivered && (
        <CoordinatorSubcontractActionsPanel
          gate2={{
            orderId: order.id,
            orderCode: order.code,
            productionStatus: order.production_status,
            deliveryStatus: order.delivery_status,
            orderStatus: order.status,
            hasQcPhoto: order.gate2.hasQcPhoto ?? false,
            hasShipperInfo: order.gate2.hasShipperInfo ?? false,
            hasDeliveryProof: order.gate2.hasDeliveryProof ?? false,
            shipperInfo: order.gate2.shipperInfo,
          }}
          onActionDone={() => {
            // Trigger re-render của parent list (coordinator board sẽ mutate SWR)
            window.dispatchEvent(new CustomEvent("coordinator:gate2:action", { detail: { orderId: order.id } }))
          }}
        />
      )}

      {/* Tác vụ của bước hiện tại (PO 16/10/2026) */}
      {!isDelivered && (
        <CoordinatorCardActions order={order} policy={policy} workflowPolicy={workflowPolicy} isUrgent={isUrgent} blockerOf={blockerOf} onOpen={onOpen} />
      )}
    </div>
  )
}
