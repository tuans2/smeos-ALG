"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { AlertTriangle, Clock, MessageSquare, Phone } from "@/components/ui/icons"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { zaloHref } from "@/components/greeting-card/work/work-item-card"
import { groupSaleKanban } from "@/modules/greeting-card/domain/sale-kanban"
import { STEP_OWNER_LABEL, formatMinutes } from "@/modules/greeting-card/domain/step-sla"
import { getIndustryPipelineSteps, type TrackingPipelineItem, type TrackingPipelineStepId } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import { BrochureOrderDetailModal, type OrderDetailModalTarget } from "@/components/greeting-card/brochure-order-detail-modal"
import { StaffNametagGroup } from "@/components/greeting-card/staff-nametag"
import { classifyOrderTimeTier, type OrderTimeTier } from "@/modules/greeting-card/domain/order-time-tier"
import { TierCollapsibleSection } from "@/components/greeting-card/coordinator/tier-collapsible-section"
import { isUrgentOrder } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

interface Props {
  items: TrackingPipelineItem[]
  now: number
  onOpenNotes: (item: TrackingPipelineItem, stepId?: TrackingPipelineStepId) => void
  /** Đang xem "Tất cả khách" → ghi tên sale phụ trách trên thẻ. */
  showSale: boolean
  /** Đơn đã xong đang bị ẩn (chưa bấm lọc "Xong") → cột cuối nhắc cách xem. */
  doneHidden: boolean
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`
const ACTION = "inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-caption font-bold text-text hover:bg-surface-alt"

/** Kanban của Sale: 9 cột = 9 bước của quy trình, phân tầng hiển thị theo thời gian. */
export function SalesKanbanView({ items, now, onOpenNotes, showSale, doneHidden }: Props) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const [detailTarget, setDetailTarget] = useState<OrderDetailModalTarget | null>(null)
  const pipelineSteps = getIndustryPipelineSteps(organization?.industry)
  const columns = groupSaleKanban(items, pipelineSteps)

  const buildDetailTarget = (item: TrackingPipelineItem): OrderDetailModalTarget => ({
    orderId: item.orderId,
    sessionId: item.sessionId,
    orderCode: item.orderCode,
    sendCode: item.sendCode,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    recipientName: item.recipientName,
    recipientPhone: item.recipientPhone,
    deliveryAddress: item.deliveryAddress,
    deliveryDate: item.deliveryDate,
    deliveryTimeSlot: item.deliveryTimeSlot,
    deliveryZone: item.deliveryZone,
    cardMessage: item.cardMessage,
    productName: item.productName,
    productImageUrl: item.productImageUrl,
    totalVnd: item.totalVnd,
    paidVnd: item.paidVnd,
    balanceVnd: item.balanceVnd,
    saleId: item.saleId,
    saleName: item.saleName,
    coordinatorId: item.coordinatorId,
    coordinatorName: item.coordinatorName,
    currentStepId: item.currentStepId,
    currentStepTitle: item.currentStepTitle,
    status: item.orderStatus,
    productionStatus: item.productionStatus,
    deliveryStatus: item.deliveryStatus,
    channel: item.channel,
    paymentProofUrl: item.paymentProofUrl,
    paymentProofBalanceUrl: item.paymentProofBalanceUrl,
    createdAt: item.createdAt, copiedAt: item.copiedAt, openedAt: item.openedAt, lastActiveAt: item.lastActiveAt,
  })

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1" aria-label="Bảng Kanban khách theo 9 bước">
        {columns.map(({ step, items: colItems, needsMe }) => {
          const isDoneCol = step.id === "STEP_9_COMPLETED"

          // Phân nhóm đơn theo các tầng thời gian
          const overdueItems: TrackingPipelineItem[] = []
          const urgentItems: TrackingPipelineItem[] = []
          const currentItems: TrackingPipelineItem[] = []
          const futureItems: TrackingPipelineItem[] = []

          for (const item of colItems) {
            if (isDoneCol) {
              currentItems.push(item)
              continue
            }
            const tier = classifyOrderTimeTier({
              deliveryDate: item.deliveryDate,
              deliveryTimeSlot: item.deliveryTimeSlot,
              isStuck: !!item.stuck,
            }, now)

            if (tier === "OVERDUE") overdueItems.push(item)
            else if (tier === "URGENT") urgentItems.push(item)
            else if (tier === "FUTURE") futureItems.push(item)
            else currentItems.push(item)
          }

          const renderCard = (item: TrackingPipelineItem, tier: OrderTimeTier) => (
            <SaleKanbanCard
              key={item.id}
              item={item}
              tier={tier}
              now={now}
              onOpenNotes={onOpenNotes}
              showSale={showSale}
              onOpenDetail={() => setDetailTarget(buildDetailTarget(item))}
            />
          )

          return (
            <section
              key={step.id}
              aria-label={`Bước ${step.orderIndex}: ${step.title}`}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface-alt p-2.5 shadow-xs"
            >
              <header className="flex flex-col gap-0.5 px-1 py-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption font-bold text-text-muted">Bước {step.orderIndex}</span>
                  <div className="flex items-center gap-1">
                    {overdueItems.length > 0 && (
                      <span className="rounded-full border border-danger/30 bg-danger-bg px-1.5 py-0.5 text-caption font-bold text-danger">
                        {overdueItems.length} trễ
                      </span>
                    )}
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-caption font-bold text-text-muted">
                      {colItems.length}
                    </span>
                  </div>
                </div>
                <h3 className="text-body-sm font-extrabold text-text">{step.title}</h3>
                <p className="text-caption text-text-muted">
                  Phụ trách: {step.roleResponsible}
                  {needsMe > 0 && <span className="ml-1 font-semibold text-danger">· {needsMe} cần bạn</span>}
                </p>
              </header>

              <div className="flex min-h-[120px] flex-col gap-2">
                {colItems.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 p-4 text-center text-caption italic text-text-muted">
                    {step.id === "STEP_9_COMPLETED" && doneHidden ? "Bấm lọc “Xong” để xem khách đã hoàn tất" : "Không có khách"}
                  </div>
                ) : (
                  <>
                    {/* TẦNG 1: ĐƠN QUÁ HẠN (Mặc định THU GỌN) */}
                    {overdueItems.length > 0 && (
                      <TierCollapsibleSection type="OVERDUE" count={overdueItems.length}>
                        {overdueItems.map((i) => renderCard(i, "OVERDUE"))}
                      </TierCollapsibleSection>
                    )}

                    {/* TẦNG 2: TIÊU ĐIỂM HÀNH ĐỘNG (Sắp hạn + Trong ca) - LUÔN BUNG MỞ */}
                    {urgentItems.map((i) => renderCard(i, "URGENT"))}
                    {currentItems.map((i) => renderCard(i, "CURRENT"))}

                    {/* TẦNG 3: ĐƠN CA SAU & ĐẶT TRƯỚC - Mặc định THU GỌN */}
                    {futureItems.length > 0 && (
                      <TierCollapsibleSection type="FUTURE" count={futureItems.length}>
                        {futureItems.map((i) => renderCard(i, "FUTURE"))}
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
          onOpenNotes={() => {
            const found = items.find((i) => (detailTarget.orderId && i.orderId === detailTarget.orderId) || i.sessionId === detailTarget.sessionId)
            if (found) onOpenNotes(found, found.currentStepId)
          }}
        />
      )}
    </>
  )
}

function SaleKanbanCard({
  item,
  tier,
  now,
  onOpenNotes,
  showSale,
  onOpenDetail,
}: {
  item: TrackingPipelineItem
  tier: OrderTimeTier
  now: number
  onOpenNotes: Props["onOpenNotes"]
  showSale: boolean
  onOpenDetail: () => void
}) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const mine = item.stuck?.owner === "SALE"
  const waited = Math.max(0, Math.floor((now - Date.parse(item.stepStartedAt)) / 60_000))
  const isUrgent = isUrgentOrder({
    deliveryDate: item.deliveryDate,
    deliveryTimeSlot: item.deliveryTimeSlot,
  })

  let tierBorder = "border-border"
  if (isUrgent || tier === "OVERDUE" || mine) {
    tierBorder = "border-danger/60 bg-danger-bg/10"
  } else if (tier === "URGENT") {
    tierBorder = "border-warning/70 bg-warning-bg/15 shadow-xs"
  }

  return (
    <article
      data-focus-key={item.orderId ?? item.sessionId}
      className={`flex flex-col gap-2 rounded-xl border bg-surface p-3 shadow-xs transition-shadow hover:shadow-md ${tierBorder}`}
    >
      {/* Clickable Header & Info to open detail pop-up */}
      <Button variant="ghost"
        type="button"
        onClick={onOpenDetail}
        className="text-[length:inherit] h-auto p-0 justify-start font-[inherit] flex flex-col gap-2 text-left w-full cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-1.5 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="min-w-0 truncate text-body-sm font-bold text-text group-hover:text-primary transition-colors">
              {item.customerName}
            </span>
            {isUrgent ? (
              <span className="rounded-md bg-danger-bg px-1.5 py-0.5 text-caption font-extrabold text-danger shrink-0 animate-pulse motion-reduce:animate-none">
                HỎA TỐC
              </span>
            ) : tier === "OVERDUE" ? (
              <span className="rounded-md bg-danger-bg px-1.5 py-0.5 text-caption font-extrabold text-danger shrink-0">
                Quá hạn
              </span>
            ) : tier === "URGENT" ? (
              <span className="rounded-md bg-warning-bg px-1.5 py-0.5 text-caption font-extrabold text-warning-text shrink-0 animate-pulse motion-reduce:animate-none">
                Sắp đến hạn
              </span>
            ) : null}
          </div>
          <span className="shrink-0 font-mono text-caption text-text-muted">
            {item.orderCode ? `Đơn ${item.orderCode}` : `Link ${item.sendCode}`}
          </span>
        </div>

        <StaffNametagGroup item={item} />

        {/* MỐC THỜI GIAN GIAO HÀNG */}
        {(item.deliveryTimeSlot || item.deliveryDate) && (
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
              Lịch: {item.deliveryTimeSlot || orderTerms.fallbackTimeSlotText}
              {item.deliveryDate ? ` · ${item.deliveryDate}` : ""}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 w-full">
          <FlowerImage
            src={item.productImageUrl}
            alt={item.productName}
            sizes="40px"
            fallback="icon"
            className="h-10 w-10 shrink-0 rounded-lg border border-border"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption font-semibold text-text">{item.productName}</p>
            <p className="truncate text-caption font-extrabold text-primary">
              {item.totalVnd > 0 ? vnd(item.totalVnd) : "Chưa có giá"}
            </p>
          </div>
        </div>

        <p className="inline-flex items-center gap-1 text-caption text-text-muted">
          <Clock size={12} aria-hidden="true" /> Ở bước này {formatMinutes(waited)}
          {showSale && <span className="truncate">· {item.saleName}</span>}
        </p>
      </Button>

      {item.stuck && (
        <p
          role={mine ? "alert" : undefined}
          className={`flex items-start gap-1.5 rounded-lg p-2 text-caption font-semibold ${
            mine ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning-text"
          }`}
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{mine ? "Cần bạn: " : `Đang chờ ${STEP_OWNER_LABEL[item.stuck.owner]}: `}{item.stuck.message}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
        {item.customerPhone && (
          <>
            <a href={`tel:${item.customerPhone}`} className={ACTION}>
              <Phone size={12} aria-hidden="true" /> Gọi
            </a>
            <a href={zaloHref(item.customerPhone)} target="_blank" rel="noreferrer" className={ACTION}>
              Zalo
            </a>
          </>
        )}
        {item.paidVnd > 0 && item.balanceVnd > 0 && item.currentStepId === "STEP_7_READY_QC" && (
          <Button variant="outline"
            type="button"
            onClick={() => {
              const url = typeof window !== "undefined" ? `${window.location.origin}/b/${item.sendCode}` : ""
              const msg = organization?.industry === "HOMESTAY"
                ? `Dạ chào anh/chị, ${terms.sampleProduct.toLowerCase()} cho đơn #${item.orderCode || item.sendCode} đã sẵn sàng đón tiếp ạ! Anh/chị mở link kiểm tra thông tin và thanh toán phần còn lại ${item.balanceVnd.toLocaleString("vi-VN")} đ để hoàn tất thủ tục nhé:${url ? ` ${url}` : ""}`
                : `Dạ chào anh/chị, ${terms.sampleProduct.toLowerCase()} cho đơn #${item.orderCode || item.sendCode} đã ${terms.makerAction.toLowerCase()} hoàn tất ạ! Anh/chị mở link kiểm tra ${terms.completedProductPhoto.toLowerCase()} và thanh toán phần còn lại ${item.balanceVnd.toLocaleString("vi-VN")} đ để cửa hàng giao nhé:${url ? ` ${url}` : ""}`
              if (typeof navigator !== "undefined") void navigator.clipboard.writeText(msg)
            }}
            className="py-0 inline-flex h-8 items-center gap-1 rounded-lg border border-warning/40 bg-warning-bg/40 px-2 text-caption font-bold text-warning-text hover:bg-warning-bg transition-colors"
          >
            📋 Nhắc TT lần 2
          </Button>
        )}
        <Button variant="ghost" type="button" onClick={() => onOpenNotes(item, item.currentStepId)} className={ACTION}>
          <MessageSquare size={12} className="text-primary" aria-hidden="true" /> Nhắn tin
        </Button>
      </div>
    </article>
  )
}
