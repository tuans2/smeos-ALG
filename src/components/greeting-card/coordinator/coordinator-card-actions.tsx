"use client"

import React from "react"
import { UserCheck, Truck, Image as ImageIcon, Camera, PackageX, Shuffle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { CoordinatorAction } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import type { BrochurePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { shouldBlockDispatchForBalance, type BrochureWorkflowPolicy } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { noActionReason, visibleCoordinatorActions } from "@/modules/greeting-card/domain/coordinator-card-actions"
import { substituteLockReason } from "@/modules/greeting-card/domain/substitute-proposal"
import type { BrochureOrder, ModalState } from "./coordinator-order-card"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

const ACTION_VIEW: Record<CoordinatorAction, { label: string; icon: typeof Truck; modal: "florist" | "product-photo" | "dispatch" | "recipient-photo" | "delivery-failed" }> = {
  "assign-florist": { label: "Giao Florist", icon: UserCheck, modal: "florist" },
  "product-photo": { label: "Chụp thành phẩm", icon: Camera, modal: "product-photo" },
  "dispatch-shipping": { label: "Giao Ship", icon: Truck, modal: "dispatch" },
  "recipient-photo": { label: "Ảnh người nhận", icon: ImageIcon, modal: "recipient-photo" },
  "delivery-failed": { label: "Giao không thành công", icon: PackageX, modal: "delivery-failed" },
}

/**
 * Thanh tác vụ thẻ đơn tab Điều phối: chỉ hiện việc của bước hiện tại (PO 16/10/2026) — xem
 * `domain/coordinator-card-actions.ts`. Mọi thao tác khác vẫn mở được qua "Xem chi tiết".
 */
export function CoordinatorCardActions({
  order, policy, workflowPolicy, isUrgent, blockerOf, onOpen,
}: {
  order: BrochureOrder
  policy: BrochurePaymentPolicy
  workflowPolicy?: BrochureWorkflowPolicy | undefined
  isUrgent: boolean
  blockerOf: (action: CoordinatorAction) => string | null
  onOpen: (m: ModalState) => void
}) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"
  const makerTitleShort = terms.makerTitle.split("/")[0]?.trim() || "Florist"

  const actions = visibleCoordinatorActions(blockerOf, { status: order.status, productionStatus: order.production_status, deliveryStatus: order.delivery_status })
  const substituteLock = substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status })
  const isBlockedByBalance = workflowPolicy
    ? shouldBlockDispatchForBalance(workflowPolicy, { totalVnd: order.total_vnd, paidVnd: order.paid_vnd }, isUrgent)
    : policy.requireFullBeforeDispatch
  const isWaitingSecondPayment = order.paid_vnd > 0 && order.paid_vnd < order.total_vnd && isBlockedByBalance &&
    (order.production_status === "READY" || order.production_status === "DONE")

  const label = (a: CoordinatorAction) => {
    if (a === "assign-florist") return `Giao ${makerTitleShort}`
    if (a === "product-photo") return isStay ? "Chụp phòng" : terms.completedProductPhoto.includes("món") ? "Chụp ảnh món" : "Chụp thành phẩm"
    if (a === "dispatch-shipping") {
      if (order.delivery_status === "FAILED") return isStay ? "Đón tiếp lại" : "Giao lại"
      if (isWaitingSecondPayment) return "Chờ TT lần 2"
      return isStay ? "Đón tiếp" : "Giao Ship"
    }
    if (a === "recipient-photo") return isStay ? "Ảnh đón tiếp" : "Ảnh người nhận"
    if (a === "delivery-failed") return isStay ? "Khách không đến" : "Giao không thành công"
    return ACTION_VIEW[a as CoordinatorAction].label
  }

  return (
    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
      {actions.length === 0 && (
        <p className="col-span-2 rounded-lg bg-surface-alt px-3 py-2 text-caption text-text-muted">{noActionReason(blockerOf)}</p>
      )}
      {actions.map(({ action, blocker }) => {
        const v = ACTION_VIEW[action]
        const Icon = v.icon
        return (
          <div key={action} className={actions.length % 2 === 1 && action === actions.at(-1)?.action ? "col-span-2" : ""}>
            <Button
              type="button"
              variant={action === "recipient-photo" ? "secondary" : "outline"}
              size="sm"
              disabled={!!blocker}
              title={blocker ?? undefined}
              onClick={() => onOpen({ type: v.modal, orderId: order.id, orderCode: order.code })}
              className={`w-full text-caption gap-1.5 h-8 ${action === "dispatch-shipping" && isWaitingSecondPayment ? "border-warning/50 text-warning-text bg-warning-bg/30" : ""}`}
            >
              <Icon size={13} />
              {label(action)}
            </Button>
            {blocker && <p className="mt-1 text-caption text-text-muted">{blocker}</p>}
          </div>
        )
      })}

      {!substituteLock && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Không làm được mẫu khách chọn — gửi khách lựa chọn khác"
          onClick={() => onOpen({ type: "substitute", orderId: order.id, orderCode: order.code })}
          className="col-span-2 text-caption gap-1.5 h-8"
        >
          <Shuffle size={13} />
          Đề xuất {terms.sampleProduct.replace(/ chuẩn$/i, "").toLowerCase()} khác
        </Button>
      )}

      <Button variant="ghost"
        type="button"
        onClick={() => onOpen({ type: "cancel-proposal", orderId: order.id, orderCode: order.code, totalVnd: order.total_vnd, paidVnd: order.paid_vnd, deliveryStatus: order.delivery_status })}
        className="h-auto p-0 font-[inherit] gap-0 col-span-2 text-caption text-text-muted hover:text-danger hover:underline text-center pt-1 transition-colors"
      >
        Đề xuất Hủy / Hoàn tiền đơn này
      </Button>
    </div>
  )
}
