"use client"

import React, { useState } from "react"
import { Clock, UserCheck, Flower2, Camera, Truck, CheckCircle2, Home, Bed, Utensils, Scissors, Package, Sparkles } from "@/components/ui/icons"
import type { BrochureOrder, ModalState } from "./coordinator-order-card"
import type { BrochurePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import type { TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import { sortByDelivery } from "@/modules/greeting-card/domain/coordinator-board"
import { BrochureOrderDetailModal, type OrderDetailModalTarget } from "@/components/greeting-card/brochure-order-detail-modal"
import { classifyOrderTimeTier, type OrderTimeTier } from "@/modules/greeting-card/domain/order-time-tier"
import { TierCollapsibleSection } from "./tier-collapsible-section"
import { CoordinatorKanbanCard } from "./coordinator-kanban-card"
import { useSession } from "@/lib/session"

export type CoordinatorKanbanColId =
  | "PENDING"
  | "ASSIGNED"
  | "ARRANGING"
  | "READY"
  | "DELIVERING"
  | "DELIVERED"

export interface CoordinatorKanbanColDef {
  id: CoordinatorKanbanColId
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

export const COORDINATOR_KANBAN_COLS: readonly CoordinatorKanbanColDef[] = [
  { id: "PENDING", label: "Chờ xử lý", icon: Clock },
  { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
  { id: "ARRANGING", label: "Đang cắm", icon: Flower2 },
  { id: "READY", label: "Đã cắm xong", icon: Camera },
  { id: "DELIVERING", label: "Đang giao", icon: Truck },
  { id: "DELIVERED", label: "Đã giao", icon: CheckCircle2 },
]

export function getCoordinatorKanbanCols(industryKey?: string | null): readonly CoordinatorKanbanColDef[] {
  const ind = (industryKey ?? "").toUpperCase()
  if (ind === "HOMESTAY") {
    return [
      { id: "PENDING", label: "Chờ xử lý", icon: Clock },
      { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
      { id: "ARRANGING", label: "Chuẩn bị phòng", icon: Home },
      { id: "READY", label: "Phòng sẵn sàng", icon: Sparkles },
      { id: "DELIVERING", label: "Đang lưu trú", icon: Bed },
      { id: "DELIVERED", label: "Đã trả phòng", icon: CheckCircle2 },
    ]
  }
  if (ind === "FASHION") {
    return [
      { id: "PENDING", label: "Chờ xử lý", icon: Clock },
      { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
      { id: "ARRANGING", label: "Đang may đo", icon: Scissors },
      { id: "READY", label: "May xong", icon: Camera },
      { id: "DELIVERING", label: "Đang giao", icon: Truck },
      { id: "DELIVERED", label: "Đã giao", icon: CheckCircle2 },
    ]
  }
  if (ind === "FNB") {
    return [
      { id: "PENDING", label: "Chờ xử lý", icon: Clock },
      { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
      { id: "ARRANGING", label: "Đang chế biến", icon: Utensils },
      { id: "READY", label: "Món sẵn sàng", icon: Camera },
      { id: "DELIVERING", label: "Đang phục vụ", icon: Truck },
      { id: "DELIVERED", label: "Đã hoàn tất", icon: CheckCircle2 },
    ]
  }
  if (ind === "CRAFT_GIFT") {
    return [
      { id: "PENDING", label: "Chờ xử lý", icon: Clock },
      { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
      { id: "ARRANGING", label: "Đang chế tác", icon: Sparkles },
      { id: "READY", label: "Đã hoàn thành", icon: Camera },
      { id: "DELIVERING", label: "Đang giao", icon: Truck },
      { id: "DELIVERED", label: "Đã giao", icon: CheckCircle2 },
    ]
  }
  if (ind === "RETAIL_GENERAL") {
    return [
      { id: "PENDING", label: "Chờ xử lý", icon: Clock },
      { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
      { id: "ARRANGING", label: "Đang đóng gói", icon: Package },
      { id: "READY", label: "Đã đóng gói", icon: Camera },
      { id: "DELIVERING", label: "Đang giao", icon: Truck },
      { id: "DELIVERED", label: "Đã giao", icon: CheckCircle2 },
    ]
  }
  if (ind === "SERVICES") {
    return [
      { id: "PENDING", label: "Chờ xử lý", icon: Clock },
      { id: "ASSIGNED", label: "Đã phân công", icon: UserCheck },
      { id: "ARRANGING", label: "Đang thực hiện", icon: Sparkles },
      { id: "READY", label: "Đã nghiệm thu", icon: Camera },
      { id: "DELIVERING", label: "Đang triển khai", icon: Truck },
      { id: "DELIVERED", label: "Hoàn tất dịch vụ", icon: CheckCircle2 },
    ]
  }
  return COORDINATOR_KANBAN_COLS
}

export function getCoordinatorOrderStage(o: BrochureOrder): CoordinatorKanbanColId {
  if (o.delivery_status === "DELIVERED" || o.status === "COMPLETED") return "DELIVERED"
  if (o.delivery_status === "DELIVERING" || o.delivery_status === "DISPATCHED") return "DELIVERING"
  if (o.production_status === "READY" || o.production_status === "QUALITY_CHECK") return "READY"
  if (o.production_status === "ARRANGING") return "ARRANGING"
  if (o.production_status === "ASSIGNED") return "ASSIGNED"
  return "PENDING"
}

interface CoordinatorKanbanViewProps {
  orders: BrochureOrder[]
  policy: BrochurePaymentPolicy
  onOpen: (m: ModalState) => void
  workOf: Map<string, TrackingViewItem>
  now: number
  onRefresh?: (() => void) | undefined
  workflowPolicy?: import("@/modules/greeting-card/domain/brochure-workflow-policy").BrochureWorkflowPolicy | undefined
}

export function CoordinatorKanbanView({
  orders,
  policy,
  onOpen,
  workOf,
  now,
  onRefresh,
  workflowPolicy,
}: CoordinatorKanbanViewProps) {
  const { organization } = useSession()
  const kanbanCols = getCoordinatorKanbanCols(organization?.industry)
  const [detailTarget, setDetailTarget] = useState<OrderDetailModalTarget | null>(null)
  const grouped = new Map<CoordinatorKanbanColId, BrochureOrder[]>()
  for (const col of kanbanCols) grouped.set(col.id, [])

  for (const o of orders) {
    const stage = getCoordinatorOrderStage(o)
    grouped.get(stage)?.push(o)
  }

  const buildDetailTarget = (o: BrochureOrder, col: CoordinatorKanbanColDef): OrderDetailModalTarget => {
    const work = workOf.get(o.id)
    return {
      orderId: o.id,
      orderCode: o.code,
      sendCode: o.greeting_sessions[0]?.send_code,
      customerName: work?.customerName ?? (o.customer?.name || o.delivery_address?.recipientName),
      customerPhone: work?.customerPhone ?? (o.customer?.phone || o.delivery_address?.phone),
      recipientName: o.delivery_address?.recipientName,
      recipientPhone: o.delivery_address?.phone,
      deliveryAddress: o.delivery_address?.street || [o.delivery_address?.street, o.delivery_address?.notes].filter(Boolean).join(" · "),
      deliveryDate: o.delivery_window?.date,
      deliveryTimeSlot: o.delivery_window?.timeSlot,
      cardMessage: o.card_message,
      productName: o.product.name,
      productImageUrl: o.product.imageUrl,
      flowersSummary: o.product.flowersSummary,
      totalVnd: o.total_vnd,
      paidVnd: o.paid_vnd,
      balanceVnd: Math.max(0, o.total_vnd - o.paid_vnd),
      saleId: work?.saleId ?? o.saleId,
      saleName: work?.saleName ?? o.saleName,
      coordinatorId: work?.coordinatorId ?? o.coordinatorId,
      coordinatorName: work?.coordinatorName ?? o.coordinatorName,
      currentStepId: col.id,
      currentStepTitle: col.label,
      status: o.status,
      productionStatus: o.production_status,
      deliveryStatus: o.delivery_status,
      paymentProofUrl: work?.paymentProofUrl,
      paymentProofBalanceUrl: work?.paymentProofBalanceUrl,
      createdAt: o.created_at,
    }
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1" aria-label="Bảng Kanban Điều phối">
        {kanbanCols.map((col) => {
          const Icon = col.icon
          const colOrders = sortByDelivery(grouped.get(col.id) ?? [])

          // Phân nhóm đơn theo các tầng thời gian
          const overdueOrders: BrochureOrder[] = []
          const urgentOrders: BrochureOrder[] = []
          const currentOrders: BrochureOrder[] = []
          const futureOrders: BrochureOrder[] = []

          // Riêng cột "ĐÃ GIAO" (DELIVERED) không phân loại quá hạn
          for (const o of colOrders) {
            if (col.id === "DELIVERED") {
              currentOrders.push(o)
              continue
            }
            const work = workOf.get(o.id)
            // Cùng cách tính với Kanban "Theo dõi đơn": kẹt ở bất kỳ bước nào + thời gian chuẩn của bước
            const tier = classifyOrderTimeTier(
              {
                deliveryDate: o.delivery_window?.date,
                deliveryTimeSlot: o.delivery_window?.timeSlot,
                isStuck: !!work?.stuck,
                slaState: work?.sla.state,
              },
              now
            )
            if (tier === "OVERDUE") overdueOrders.push(o)
            else if (tier === "URGENT") urgentOrders.push(o)
            else if (tier === "FUTURE") futureOrders.push(o)
            else currentOrders.push(o)
          }

          const renderCard = (o: BrochureOrder, tier: OrderTimeTier) => (
            <CoordinatorKanbanCard
              key={o.id}
              order={o}
              col={col}
              tier={tier}
              work={workOf.get(o.id)}
              policy={policy}
              onOpen={onOpen}
              onOpenDetail={() => setDetailTarget(buildDetailTarget(o, col))}
              workflowPolicy={workflowPolicy}
              now={now}
            />
          )

          return (
            <section
              key={col.id}
              aria-label={col.label}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface-alt p-2.5 shadow-xs"
            >
              <header className="flex items-center justify-between px-1 py-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className="text-primary" />
                  <h3 className="text-body-sm font-extrabold text-text">{col.label}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {overdueOrders.length > 0 && (
                    <span className="text-caption font-bold text-danger bg-danger-bg rounded-full px-1.5 py-0.5 border border-danger/30" title="Đơn quá hạn">
                      {overdueOrders.length} trễ
                    </span>
                  )}
                  <span className="text-caption font-bold text-text-muted bg-surface rounded-full px-2 py-0.5 border border-border">
                    {colOrders.length}
                  </span>
                </div>
              </header>

              <div className="flex flex-col gap-2 min-h-[120px]">
                {colOrders.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-4 text-caption text-text-muted italic border border-dashed border-border/60 rounded-xl">
                    Không có đơn
                  </div>
                ) : (
                  <>
                    {/* TẦNG 1: ĐƠN QUÁ HẠN (Mặc định THU GỌN - Click để xem) */}
                    {overdueOrders.length > 0 && (
                      <TierCollapsibleSection type="OVERDUE" count={overdueOrders.length}>
                        {overdueOrders.map((o) => renderCard(o, "OVERDUE"))}
                      </TierCollapsibleSection>
                    )}

                    {/* TẦNG 2: TIÊU ĐIỂM HÀNH ĐỘNG (Sắp hạn + Trong ca hiện tại) - LUÔN BUNG MỞ */}
                    {urgentOrders.map((o) => renderCard(o, "URGENT"))}
                    {/* Cột "Đã giao": đơn giao trong 24 giờ, thu gọn để không chiếm chỗ việc đang làm */}
                    {col.id === "DELIVERED" ? (
                      <TierCollapsibleSection type="DONE" count={currentOrders.length}>
                        {currentOrders.map((o) => renderCard(o, "CURRENT"))}
                      </TierCollapsibleSection>
                    ) : (
                      currentOrders.map((o) => renderCard(o, "CURRENT"))
                    )}

                    {/* TẦNG 3: ĐƠN TƯƠNG LAI (Ca sau & Đặt trước) - Mặc định THU GỌN */}
                    {futureOrders.length > 0 && (
                      <TierCollapsibleSection type="FUTURE" count={futureOrders.length}>
                        {futureOrders.map((o) => renderCard(o, "FUTURE"))}
                      </TierCollapsibleSection>
                    )}
                  </>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {detailTarget && (
        <BrochureOrderDetailModal
          target={detailTarget}
          onClose={() => setDetailTarget(null)}
          onCancellationProposed={() => {
            setDetailTarget(null)
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}
