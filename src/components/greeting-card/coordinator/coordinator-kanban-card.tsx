"use client"

import { PhotoApprovalNote, photoWaitBlocker } from "./photo-approval-note"
import React from "react"
import { Clock, UserCheck, Camera, Truck, CheckCircle2, ShieldCheck, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { BrochureOrder, ModalState } from "./coordinator-order-card"
import { CoordinatorBypassReviewBanner } from "./coordinator-bypass-review-banner"
import type { BrochurePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import type { TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import type { OrderTimeTier } from "@/modules/greeting-card/domain/order-time-tier"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { coordinatorActionBlocker, coordinatorAcceptanceBlocker, type CoordinatorAction } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import { paymentGateBlocker } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { StaffNametagGroup } from "@/components/greeting-card/staff-nametag"
import type { CoordinatorKanbanColDef } from "./coordinator-kanban-view"
import {
  isUrgentOrder,
  type BrochureWorkflowPolicy,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

interface CoordinatorKanbanCardProps {
  order: BrochureOrder
  col: CoordinatorKanbanColDef
  tier: OrderTimeTier
  work?: TrackingPipelineItem | undefined
  policy: BrochurePaymentPolicy
  onOpen: (m: ModalState) => void
  onOpenDetail: () => void
  workflowPolicy?: BrochureWorkflowPolicy | undefined
  /** Giờ hiện tại (tick từ tab) — đếm ngược chờ khách duyệt ảnh */
  now: number
}

export function CoordinatorKanbanCard({
  order: o,
  col,
  tier,
  work,
  policy,
  onOpen,
  onOpenDetail,
  workflowPolicy,
  now,
}: CoordinatorKanbanCardProps) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"
  const dateLabel = orderTerms.deliveryDateLabel.replace(/^(Ngày|Thời gian)\s+/i, "")
  const makerTitleShort = terms.makerTitle.split("/")[0]?.trim() || "Florist"

  const { product } = o
  const isStuck = work?.stuck?.owner === "COORDINATOR"

  const isUrgent = isUrgentOrder({
    deliveryDate: o.delivery_window?.date,
    deliveryTimeSlot: o.delivery_window?.timeSlot,
  })
  // Giao ship khi chưa qua bước ảnh: theo cài đặt ảnh QC của tiệm, khớp kiểm tra ở máy chủ
  const canSkipPhoto = policy.requireProductPhotoQC === false

  const blockerOf = (action: CoordinatorAction) =>
    coordinatorActionBlocker(
      action,
      {
        status: o.status,
        productionStatus: o.production_status,
        deliveryStatus: o.delivery_status,
      },
      { skipPhoto: canSkipPhoto },
    ) ?? paymentGateBlocker(action, policy, { totalVnd: o.total_vnd, paidVnd: o.paid_vnd })
    ?? (action === "dispatch-shipping" ? photoWaitBlocker(o.photo_approval, now) : null)

  // Viền và nền theo tầng thời gian
  let tierBorder = "border-border"
  let tierBadge = null

  if (tier === "OVERDUE" || isStuck) {
    tierBorder = "border-danger/60 bg-danger-bg/10"
    tierBadge = (
      <span className="rounded-md bg-danger-bg px-1.5 py-0.5 text-caption font-extrabold text-danger shrink-0">
        Quá hạn
      </span>
    )
  } else if (tier === "URGENT") {
    tierBorder = "border-warning/70 bg-warning-bg/15 shadow-sm"
    tierBadge = (
      <span className="rounded-md bg-warning-bg px-1.5 py-0.5 text-caption font-extrabold text-warning-text shrink-0 animate-pulse motion-reduce:animate-none">
        Sắp đến hạn
      </span>
    )
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border bg-surface p-3 text-left shadow-xs transition-shadow hover:shadow-md ${tierBorder}`}
    >
      {/* Clickable Card Body to open detail modal */}
      <Button variant="ghost"
        type="button"
        onClick={onOpenDetail}
        className="text-[length:inherit] h-auto p-0 justify-start font-[inherit] flex flex-col gap-2 text-left w-full cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-1 border-b border-border/60 pb-1.5 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-caption font-bold text-text group-hover:text-primary transition-colors">
              #{o.code}
            </span>
            {o.greeting_sessions[0]?.send_code && (
              <span className="font-mono text-caption text-text-muted bg-surface-alt px-1.5 py-0.5 rounded">
                {o.greeting_sessions[0].send_code}
              </span>
            )}
            {tierBadge}
          </div>
          <span className="text-caption font-extrabold text-primary shrink-0">
            {o.total_vnd.toLocaleString("vi-VN")} đ
          </span>
        </div>

        <StaffNametagGroup
          item={work}
          fallbackSaleName={o.saleName}
          fallbackSaleId={o.saleId}
          fallbackCoordinatorName={o.coordinatorName}
          fallbackCoordinatorId={o.coordinatorId}
          forceStage="coordinator"
          compact
        />

        {/* MỐC THỜI GIAN GIAO HÀNG */}
        <div
          className={`rounded-lg px-2.5 py-1 text-caption font-extrabold flex items-center gap-1.5 w-full ${
            tier === "OVERDUE"
              ? "bg-danger-bg text-danger border border-danger/30"
              : tier === "URGENT"
              ? "bg-warning-bg text-warning-text border border-warning/40"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          <Clock size={13} className="shrink-0" />
          <span className="truncate">
            {dateLabel}: {o.delivery_window?.timeSlot || orderTerms.fallbackTimeSlotText}
            {o.delivery_window?.date ? ` · ${o.delivery_window.date}` : ""}
          </span>
        </div>

        <div className="flex gap-2 items-center w-full">
          <FlowerImage
            src={product.imageUrl}
            alt={product.name}
            sizes="40px"
            fallback="icon"
            className="w-10 h-10 rounded-lg border border-border shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-caption font-semibold text-text truncate">
              {product.name}
            </p>
            <p className="text-caption text-text-muted truncate">
              {isStay ? "Khách: " : "Nhận: "}{o.delivery_address?.recipientName || (isStay ? "Khách lưu trú" : "Khách nhận")}
            </p>
          </div>
        </div>
      </Button>

      {/* Yêu cầu Bỏ qua bằng chứng từ Chi nhánh đang chờ Điều phối duyệt */}
      {o.gate2?.bypassRequests && (
        <div className="w-full">
          <CoordinatorBypassReviewBanner
            orderId={o.id}
            orderCode={o.code}
            bypassRequests={o.gate2.bypassRequests}
            onDecisionComplete={() => {
              window.dispatchEvent(new CustomEvent("coordinator:gate2:action", { detail: { orderId: o.id } }))
            }}
          />
        </div>
      )}

      <PhotoApprovalNote approval={o.photo_approval} now={now} />
      {/* Quick Action buttons depending on state */}
      {col.id !== "DELIVERED" && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          {col.id === "PENDING" && (() => {
            const isChain = workflowPolicy?.requireCoordinatorAcceptance === true
            const isSingleWaitingAccept = !isChain && o.status === "CONFIRMED" && (o.production_status === "WAITING" || !o.production_status)

            if (isSingleWaitingAccept) {
              return (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpen({ type: "accept-order", flow: "admin", orderId: o.id, orderCode: o.code })}
                    className="h-7 text-caption gap-1 px-2 flex-1 bg-success hover:bg-success/90 text-white font-extrabold"
                  >
                    <ShieldCheck size={12} />
                    Xác nhận đơn
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpen({ type: "reject-order", flow: "admin", orderId: o.id, orderCode: o.code })}
                    className="h-7 text-caption gap-1 px-2 border-danger/40 text-danger hover:bg-danger-bg"
                  >
                    <XCircle size={12} />
                    Từ chối
                  </Button>
                </>
              )
            }

            const paymentProofUrl = work?.paymentProofUrl || o.payment_proof_url
            const acceptBlocker = coordinatorAcceptanceBlocker(
              { status: o.status, productionStatus: o.production_status, deliveryStatus: o.delivery_status },
              { paidVnd: o.paid_vnd, paymentProofUrl },
              workflowPolicy,
            )
            if (acceptBlocker !== null) return (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!!blockerOf("assign-florist")}
                onClick={() => onOpen({ type: "florist", orderId: o.id, orderCode: o.code })}
                className="h-7 text-caption gap-1 px-2 flex-1"
              >
                <UserCheck size={12} />
                Giao {makerTitleShort}
              </Button>
            )
            return (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => onOpen({ type: "accept-order", flow: "coordinator", orderId: o.id, orderCode: o.code })}
                  className="h-7 text-caption gap-1 px-2 flex-1 bg-success hover:bg-success/90 text-white font-extrabold"
                >
                  <ShieldCheck size={12} />
                  Đã nhận tiền
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpen({ type: "reject-order", flow: "coordinator", orderId: o.id, orderCode: o.code })}
                  className="h-7 text-caption gap-1 px-2 border-danger/40 text-danger hover:bg-danger-bg"
                >
                  <XCircle size={12} />
                  Từ chối
                </Button>
              </>
            )
          })()}
          {(col.id === "ASSIGNED" || col.id === "ARRANGING") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!blockerOf("product-photo")}
              onClick={() => onOpen({ type: "product-photo", orderId: o.id, orderCode: o.code })}
              className="h-7 text-caption gap-1 px-2 flex-1"
            >
              <Camera size={12} />
              {isStay ? "Ảnh phòng" : terms.completedProductPhoto.includes("món") ? "Ảnh món" : "Ảnh TP"}
            </Button>
          )}
          {col.id === "READY" && (() => {
            const isWaitingSecondPayment =
              o.paid_vnd > 0 &&
              o.paid_vnd < o.total_vnd &&
              policy.requireFullBeforeDispatch
            return (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!!blockerOf("dispatch-shipping")}
                title={blockerOf("dispatch-shipping") ?? undefined}
                onClick={() => onOpen({ type: "dispatch", orderId: o.id, orderCode: o.code })}
                className={`h-7 text-caption gap-1 px-2 flex-1 ${isWaitingSecondPayment ? "border-warning/50 text-warning-text bg-warning-bg/30" : ""}`}
              >
                <Truck size={12} />
                {isWaitingSecondPayment ? "Chờ TT lần 2" : isStay ? "Đón tiếp" : "Giao Ship"}
              </Button>
            )
          })()}
          {col.id === "DELIVERING" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!!blockerOf("recipient-photo")}
              onClick={() => onOpen({ type: "recipient-photo", orderId: o.id, orderCode: o.code })}
              className="h-7 text-caption gap-1 px-2 flex-1"
            >
              <CheckCircle2 size={12} />
              {isStay ? "Ảnh đón tiếp" : "Ảnh nhận"}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
