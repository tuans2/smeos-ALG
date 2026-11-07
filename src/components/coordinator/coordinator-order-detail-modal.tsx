"use client"

import React, { useState } from "react"
import { Radio } from "@/components/ui/icon-set/radio"
import { X } from "@/components/ui/icon-set/x"
import { Wallet } from "@/components/ui/icon-set/wallet"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Ban } from "@/components/ui/icon-set/ban"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PartnerProductCard } from "@/components/templates/coordinator/partner-product-card"
import { FloristJobCard } from "@/components/templates/coordinator/florist-job-card"
import { AIQCReportCard } from "@/components/templates/coordinator/ai-qc-report-card"
import { DeliveryPODCard } from "@/components/templates/coordinator/delivery-pod-card"
import { SalesOrderIntakeCard } from "@/components/templates/coordinator/sales-order-intake-card"
import { coordinatorApi, errorMessage, type CoordinationOrder } from "./coordinator-api"
import type { VisibleCustomField } from "./custom-fields-section"
import {
  type DetailTab,
  asAddress,
  priorityOf,
  fmtTime,
  fmtVnd,
  bomFlowersOf,
} from "./coordinator-helpers"
import { CoordinatorExceptionTab } from "./coordinator-exception-tab"

export {
  type DetailTab,
  asAddress,
  priorityOf,
  fmtTime,
  fmtVnd,
  bomFlowersOf,
} from "./coordinator-helpers"

export interface CoordinatorOrderDetailModalProps {
  isOpen: boolean
  order: CoordinationOrder
  initialTab?: DetailTab | undefined
  partnerVisibleCustomFields: VisibleCustomField[]
  suggestedFeeVnd?: number | undefined
  onClose: () => void
  onUpdate: (order: CoordinationOrder) => void
  onAdvanceStage: (order: CoordinationOrder) => void
  onOpenAssignModal: () => void
  onOpenProductionModal: () => void
  onOpenQcModal: () => void
  onOpenDispatchModal: () => void
  onOpenClosureModal: () => void
  onOpenPaymentModal: () => void
  onConfirmAcceptance: (suggestedFee: number) => void
  onCancelFloristOrder: () => void
}

export function CoordinatorOrderDetailModal({
  isOpen,
  order,
  initialTab = "BRIEF",
  partnerVisibleCustomFields,
  suggestedFeeVnd,
  onClose,
  onUpdate,
  onAdvanceStage,
  onOpenAssignModal,
  onOpenProductionModal,
  onOpenQcModal,
  onOpenDispatchModal,
  onOpenClosureModal,
  onOpenPaymentModal,
  onConfirmAcceptance,
  onCancelFloristOrder,
}: CoordinatorOrderDetailModalProps) {
  const [detailModalTab, setDetailModalTab] = useState<DetailTab>(initialTab)
  const [cancelReason, setCancelReason] = useState("")
  const [detailError, setDetailError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setDetailError("Ghi lý do huỷ đơn.")
      return
    }
    setDetailError(null)
    try {
      const updated = await coordinatorApi.cancel(order.id, cancelReason.trim())
      onUpdate(updated)
      setCancelReason("")
    } catch (error) {
      setDetailError(errorMessage(error))
    }
  }

  const tabButton = (tab: DetailTab, label: string, extra = "") => (
    <Button
      type="button"
      size="sm"
      variant={detailModalTab === tab ? "primary" : "ghost"}
      onClick={() => setDetailModalTab(tab)}
      className={`px-3 py-1.5 rounded-lg text-caption font-bold whitespace-nowrap transition-colors ${extra}`}
    >
      {label}
    </Button>
  )

  const fieldClass =
    "px-3 py-2 rounded-xl border border-border bg-surface text-text text-caption focus:outline-none focus:border-primary"

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-primary" />
            <h2 className="text-title-sm font-extrabold text-text">
              Hồ Sơ Điều Phối Đơn #{order.orderCode} · {order.stageLabel}
            </h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="p-4 border-b border-border bg-surface-alt/40 flex items-center gap-2 overflow-x-auto">
          {tabButton("SALES_INTAKE", "P1 • Tiếp nhận (T01)")}
          {tabButton("BRIEF", "P2 • Thẻ sản phẩm (T02)")}
          {tabButton("PRODUCTION", "P4 • Phiếu chế tác (T07)")}
          {tabButton("QC", "P5 • Kiểm định QC (T14)")}
          {tabButton("DELIVERY", "P6 • Giao hàng & POD (T21)")}
          {tabButton(
            "EXCEPTION",
            `Sự cố (${order.exceptions.filter((e) => e.status === "OPEN" || e.status === "IN_PROGRESS").length})`,
            order.hasException ? "text-danger bg-danger/10" : ""
          )}
          {tabButton("CLOSURE", "P7 • Nghiệm thu (T25)")}
        </div>

        <div className="px-4 py-2 flex items-center justify-between gap-2 bg-surface-alt/30 border-b border-border text-caption flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-text-muted">
              Tổng <strong className="text-text">{fmtVnd(order.unitPriceVnd)}</strong>
            </span>
            <span className="text-text-muted">
              Đã thu <strong className="text-success">{fmtVnd(order.paidVnd)}</strong>
            </span>
            <span className="text-text-muted">
              Còn phải thu{" "}
              <strong className={order.balanceVnd > 0 ? "text-danger" : "text-success"}>{fmtVnd(order.balanceVnd)}</strong>
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={onOpenPaymentModal} className="h-7 px-2.5 text-caption font-bold gap-1">
            <Wallet size={12} /> Sổ thu (T01/T02/T05)
          </Button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {detailError && (
            <div role="alert" className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-caption font-semibold">
              {detailError}
            </div>
          )}

          {detailModalTab === "SALES_INTAKE" && (
            <SalesOrderIntakeCard
              orderCode={order.orderCode}
              source="Tiếp nhận tại Tháp điều phối đơn"
              customerName={order.customerName}
              customerTier={order.customerTier}
              recipientName={order.recipientName}
              recipientPhone={order.recipientPhone}
              deliveryAddress={asAddress(order.deliveryAddress)}
              deliveryTargetTime={order.deliveryTargetTime}
              productTitle={order.productTitle}
              sampleImageUrl={order.sampleImageUrl}
              unitPriceVnd={order.unitPriceVnd}
              priority={priorityOf(order)}
            />
          )}

          {detailModalTab === "BRIEF" && (
            <PartnerProductCard
              orderCode={order.orderCode}
              productTitle={order.productTitle}
              sampleImageUrl={order.sampleImageUrl}
              flowers={bomFlowersOf(order)}
              foliage={order.foliage}
              wrapping={order.wrapping}
              accessories={order.accessories}
              unitPriceVnd={order.unitPriceVnd}
              partnerPayoutVnd={order.partnerPayoutVnd ?? undefined}
              deliveryTargetTime={order.deliveryTargetTime}
              deliveryAddress={asAddress(order.deliveryAddress)}
              recipientName={order.recipientName}
              recipientPhone={order.recipientPhone}
              cardMessage={order.cardMessage}
              technicalNotes={order.partnerInstruction ?? undefined}
              partnerName={order.partnerName ?? undefined}
              riskLevel={order.riskLevel}
              riskReason={order.riskReason}
              customFields={partnerVisibleCustomFields}
              {...(order.stage === "COMPLETED" || order.stage === "CANCELLED"
                ? {}
                : { onAdvanceStage: () => onAdvanceStage(order) })}
            />
          )}

          {detailModalTab === "PRODUCTION" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-surface-alt/50 p-3 rounded-xl border border-border text-caption">
                <span>
                  Xưởng: <strong>{order.partnerName ?? "Chưa phân công"}</strong> · Tiến độ{" "}
                  <strong>{order.productionProgress}%</strong>
                  {typeof order.partnerPayoutVnd === "number" && (
                    <span className="ml-2 text-primary font-bold">
                      · Giá chốt: {fmtVnd(order.partnerPayoutVnd)}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onOpenAssignModal} className="text-caption h-7 px-2.5 font-bold">
                    Phân công đối tác (T06)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={order.stage !== "IN_PRODUCTION"}
                    onClick={onOpenProductionModal}
                    className="text-caption h-7 px-2.5 font-bold"
                  >
                    Cập nhật tiến độ / Thiếu hoa (T10)
                  </Button>
                </div>
              </div>
              <FloristJobCard
                orderCode={order.orderCode}
                recipeTitle={order.productTitle}
                unitPriceVnd={order.unitPriceVnd}
                suggestedFeeVnd={suggestedFeeVnd}
                targetReadyTime={order.deliveryTargetTime}
                deliveryTargetTime={order.deliveryTargetTime}
                sampleImageUrl={order.sampleImageUrl}
                flowers={bomFlowersOf(order)}
                foliage={order.foliage}
                wrapping={order.wrapping}
                accessories={order.accessories}
                cardMessage={order.cardMessage}
                partnerInstruction={order.partnerInstruction}
                partnerName={order.partnerName ?? undefined}
                recipientName={order.recipientName}
                recipientPhone={order.recipientPhone}
                deliveryAddress={order.deliveryAddress}
                customFields={partnerVisibleCustomFields}
                onConfirmAcceptance={onConfirmAcceptance}
                onCancelOrder={onCancelFloristOrder}
                onPrint={() => window.print()}
              />
            </div>
          )}

          {detailModalTab === "QC" && (
            <AIQCReportCard
              orderCode={order.orderCode}
              qcStatus={(order.qc?.status as "PENDING" | "PASSED" | "REJECTED" | "REWORK_REQUESTED" | undefined) ?? "PENDING"}
              aiScore={order.qc?.aiScore ?? null}
              aiCritique={order.qc?.notes ?? null}
              finishedImageUrls={order.finishedImageUrls}
              onApprove={onOpenQcModal}
            />
          )}

          {detailModalTab === "DELIVERY" && (
            <DeliveryPODCard
              orderCode={order.orderCode}
              shipperName={order.delivery.shipperName ?? "Chưa bàn giao shipper"}
              shipperPhone={order.delivery.shipperPhone ?? ""}
              deliveryAddress={asAddress(order.deliveryAddress)}
              recipientName={order.recipientName}
              recipientPhone={order.recipientPhone}
              isDelivered={order.stage === "DELIVERED" || order.stage === "COMPLETED"}
              deliveredAt={order.delivery.actualDeliveryAt ? fmtTime(order.delivery.actualDeliveryAt) : null}
              podImageUrl={order.delivery.podImageUrl}
              recipientSignatureName={order.delivery.podRecipientName}
              onConfirmComplete={onOpenDispatchModal}
            />
          )}

          {detailModalTab === "EXCEPTION" && (
            <CoordinatorExceptionTab
              order={order}
              onUpdate={onUpdate}
              onError={setDetailError}
            />
          )}

          {detailModalTab === "CLOSURE" && (
            <div className="flex flex-col gap-3 text-caption">
              {order.stage === "COMPLETED" ? (
                <div className="p-4 rounded-xl border border-success/30 bg-success/10 flex flex-col gap-1">
                  <strong className="text-success">Đã đóng lúc {fmtTime(order.closedAt)}</strong>
                  <span>Đối tác: {order.partnerName ?? "—"} · Điểm: {order.partnerRating ?? "—"}/5</span>
                  <span>
                    Tiền công đối tác:{" "}
                    {order.partnerPayoutVnd === null ? "chưa chốt" : `${order.partnerPayoutVnd.toLocaleString("vi-VN")} đ`}
                  </span>
                  {order.closureNotes && <span>Ghi chú: {order.closureNotes}</span>}
                </div>
              ) : order.stage === "CANCELLED" ? (
                <div className="p-4 rounded-xl border border-border bg-surface-alt">Đơn đã huỷ: {order.cancelledReason}</div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={order.stage !== "DELIVERED"}
                  onClick={onOpenClosureModal}
                  className="w-fit font-bold gap-1"
                >
                  <CheckCircle2 size={13} /> Nghiệm thu & đóng đơn
                </Button>
              )}

              {!["COMPLETED", "CANCELLED", "DELIVERED"].includes(order.stage) && (
                <div className="p-3 rounded-xl border border-dashed border-border flex flex-col gap-2">
                  <span className="font-bold text-text">Huỷ đơn (cần quyền điều hành)</span>
                  <Input placeholder="Lý do huỷ" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => void handleCancelOrder()} className="w-fit gap-1 text-danger border-danger/40">
                    <Ban size={13} /> Huỷ đơn
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
