"use client"

import React from "react"
import { OrderPlanningModal } from "@/components/templates/coordinator/order-planning-modal"
import { PartnerAssignmentModal } from "@/components/templates/coordinator/partner-assignment-modal"
import { ProductionUpdateModal } from "@/components/templates/coordinator/production-update-modal"
import { AiQcInspectionModal } from "@/components/templates/coordinator/ai-qc-inspection-modal"
import { DeliveryDispatchModal, type DeliveryEventInput } from "@/components/templates/coordinator/delivery-dispatch-modal"
import { OrderClosureModal } from "@/components/templates/coordinator/order-closure-modal"
import { PaymentLedgerModal } from "@/components/templates/coordinator/payment-ledger-modal"
import { ConfirmCraftAcceptanceModal } from "@/components/templates/coordinator/confirm-craft-acceptance-modal"
import { CancelFloristOrderModal } from "@/components/templates/coordinator/cancel-florist-order-modal"
import type { CoordinationOrder, CoordinationPartner } from "./coordinator-api"

export interface CoordinatorActionModalsProps {
  order: CoordinationOrder | null
  partners: CoordinationPartner[]
  suggestedFeeForAccept: number
  craftFeeSuggestionVnd?: number | undefined
  isPlanningModalOpen: boolean
  isAssignModalOpen: boolean
  isProductionUpdateModalOpen: boolean
  isQcModalOpen: boolean
  isDispatchModalOpen: boolean
  isClosureModalOpen: boolean
  isPaymentModalOpen: boolean
  isCraftAcceptModalOpen: boolean
  isCraftCancelModalOpen: boolean
  onClosePlanning: () => void
  onCloseAssign: () => void
  onCloseProductionUpdate: () => void
  onCloseQc: () => void
  onCloseDispatch: () => void
  onCloseClosure: () => void
  onClosePayment: () => void
  setIsCraftAcceptModalOpen: (open: boolean) => void
  setIsCraftCancelModalOpen: (open: boolean) => void
  onConfirmPlan: (nextAction: string) => Promise<void>
  onAssignPartner: (partnerId: string, notes: string, overrideCapacity: boolean) => Promise<void>
  onProductionUpdate: (params: {
    progressPercent: number
    action: "UPDATE_PROGRESS" | "REPORT_MATERIAL_ISSUE" | "MARK_READY"
    finishedAssetIds?: string[] | undefined
    issueNote?: string | undefined
  }) => Promise<void>
  onQc: (decision: "PASSED" | "REWORK_REQUESTED" | "REJECTED", notes: string, checklist: Record<string, boolean>) => Promise<void>
  onDelivery: (input: DeliveryEventInput) => Promise<void>
  onCloseOrder: (input: { partnerRating?: number; partnerPayoutVnd?: number; payoutReason?: string; notes?: string }) => Promise<void>
  onRecordPayment: (order: CoordinationOrder) => void
  onCraftAccept: (data: { partnerId: string; agreedCraftFeeVnd: number; notes?: string | undefined }) => Promise<void>
  onCraftCancel: (reason: string) => Promise<void>
}

export function CoordinatorActionModals({
  order,
  partners,
  suggestedFeeForAccept,
  craftFeeSuggestionVnd,
  isPlanningModalOpen,
  isAssignModalOpen,
  isProductionUpdateModalOpen,
  isQcModalOpen,
  isDispatchModalOpen,
  isClosureModalOpen,
  isPaymentModalOpen,
  isCraftAcceptModalOpen,
  isCraftCancelModalOpen,
  onClosePlanning,
  onCloseAssign,
  onCloseProductionUpdate,
  onCloseQc,
  onCloseDispatch,
  onCloseClosure,
  onClosePayment,
  setIsCraftAcceptModalOpen,
  setIsCraftCancelModalOpen,
  onConfirmPlan,
  onAssignPartner,
  onProductionUpdate,
  onQc,
  onDelivery,
  onCloseOrder,
  onRecordPayment,
  onCraftAccept,
  onCraftCancel,
}: CoordinatorActionModalsProps) {
  if (!order) return null

  return (
    <>
      <OrderPlanningModal
        isOpen={isPlanningModalOpen}
        order={order}
        onClose={onClosePlanning}
        onConfirmPlan={onConfirmPlan}
      />
      <PartnerAssignmentModal
        key={`assign-${order.id}-${isAssignModalOpen}`}
        isOpen={isAssignModalOpen}
        orderCode={order.orderCode}
        recipeTitle={order.productTitle}
        deliveryAddress={order.deliveryAddress}
        deliveryTargetTime={order.deliveryTargetTime}
        currentPartnerId={order.partner?.id ?? null}
        onClose={onCloseAssign}
        onAssign={onAssignPartner}
      />
      <ProductionUpdateModal
        isOpen={isProductionUpdateModalOpen}
        orderCode={order.orderCode}
        recipeTitle={order.productTitle}
        currentProgressPercent={order.productionProgress}
        onClose={onCloseProductionUpdate}
        onSubmitUpdate={onProductionUpdate}
      />
      <AiQcInspectionModal
        isOpen={isQcModalOpen}
        order={order}
        onClose={onCloseQc}
        onSubmit={onQc}
      />
      <DeliveryDispatchModal
        key={`dispatch-${order.id}-${isDispatchModalOpen}`}
        isOpen={isDispatchModalOpen}
        order={order}
        onClose={onCloseDispatch}
        onSubmit={onDelivery}
      />
      <OrderClosureModal
        isOpen={isClosureModalOpen}
        order={order}
        onClose={onCloseClosure}
        onSubmit={onCloseOrder}
      />
      <PaymentLedgerModal
        isOpen={isPaymentModalOpen}
        order={order}
        onClose={onClosePayment}
        onRecorded={onRecordPayment}
      />
      <ConfirmCraftAcceptanceModal
        open={isCraftAcceptModalOpen}
        onOpenChange={setIsCraftAcceptModalOpen}
        orderCode={order.orderCode}
        recipeTitle={order.productTitle}
        unitPriceVnd={order.unitPriceVnd}
        suggestedCraftFeeVnd={
          suggestedFeeForAccept ||
          craftFeeSuggestionVnd ||
          Math.round(order.unitPriceVnd * 0.5)
        }
        partners={partners}
        currentPartnerId={order.partner?.id ?? null}
        onConfirm={onCraftAccept}
      />
      <CancelFloristOrderModal
        open={isCraftCancelModalOpen}
        onOpenChange={setIsCraftCancelModalOpen}
        orderCode={order.orderCode}
        recipeTitle={order.productTitle}
        onConfirmCancel={onCraftCancel}
      />
    </>
  )
}
