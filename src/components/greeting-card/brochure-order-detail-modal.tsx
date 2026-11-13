"use client"

import { Dialog } from "@/components/ui/dialog"
import React, { useState } from "react"
import { Clock, MapPin, User, Phone, Flower2, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { EvidenceTimelineDiagram } from "./evidence-timeline-diagram"
import { OrderHistoryPanel } from "./tracking/views/timeline-view"
import { zaloHref } from "@/components/greeting-card/work/work-item-card"
import { OrderDetailFooter } from "./order-detail-footer"
import { StaffNametagGroup } from "./staff-nametag"
import { OrderDetailInfoTab } from "./order-detail-info-tab"
import { BrochureFloristJobTab } from "./brochure-florist-job-tab"
import { BrochureCustomerOrderTab } from "./brochure-customer-order-tab"

import { useSession } from "@/lib/session"
import { getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

export interface OrderDetailModalTarget {
  orderId?: string | null | undefined
  sessionId?: string | null | undefined
  orderCode?: string | null | undefined
  sendCode?: string | null | undefined
  customerName?: string | null | undefined
  customerPhone?: string | null | undefined
  recipientName?: string | null | undefined
  recipientPhone?: string | null | undefined
  deliveryAddress?: string | null | undefined
  deliveryDate?: string | null | undefined
  deliveryTimeSlot?: string | null | undefined
  deliveryZone?: string | null | undefined
  cardMessage?: string | null | undefined
  productName?: string | null | undefined
  productImageUrl?: string | null | undefined
  flowersSummary?: string | null | undefined
  totalVnd?: number | null | undefined
  paidVnd?: number | null | undefined
  balanceVnd?: number | null | undefined
  saleId?: string | null | undefined
  saleName?: string | null | undefined
  coordinatorId?: string | null | undefined
  coordinatorName?: string | null | undefined
  /** ID bước pipeline hiện tại — dùng để kiểm tra rào chắn hủy */
  currentStepId?: string | null | undefined
  currentStepTitle?: string | null | undefined
  /** Trạng thái sản xuất (WAITING | ARRANGING | READY ...) */
  productionStatus?: string | null | undefined
  deliveryStatus?: string | null | undefined
  status?: string | null | undefined
  channel?: string | null | undefined
  /** Ảnh chuyển khoản lần 1 (cọc/trả đủ) do khách tải lên */
  paymentProofUrl?: string | null | undefined
  paymentProofAnalysis?: import("@/modules/greeting-card/domain/payment-proof-analysis").PaymentProofAnalysisResult | null | undefined
  /** Ảnh chuyển khoản lần 2 (phần còn lại) do khách tải lên */
  paymentProofBalanceUrl?: string | null | undefined
  paymentProofBalanceAnalysis?: import("@/modules/greeting-card/domain/payment-proof-analysis").PaymentProofAnalysisResult | null | undefined
  /** Khách đã bấm báo chuyển khoản / có ảnh bill lần 2 */
  customerReportedPaid?: boolean | undefined
  createdAt?: string | null | undefined
  /** Link chưa có đơn: lúc gửi (sao chép) link, lúc khách mở lần đầu, lúc xem gần nhất */
  copiedAt?: string | null | undefined
  openedAt?: string | null | undefined
  lastActiveAt?: string | null | undefined
}

export interface BrochureOrderDetailModalProps {
  target: OrderDetailModalTarget | null
  onClose: () => void
  onOpenNotes?: ((target: OrderDetailModalTarget) => void) | undefined
  /** Callback khi Sale đề xuất hủy/hoàn thành công — tải lại danh sách */
  onCancellationProposed?: (() => void) | undefined
}

type DetailTab = "info" | "timeline" | "customer" | "florist"

export function BrochureOrderDetailModal({ target: inputTarget, onClose, onOpenNotes, onCancellationProposed }: BrochureOrderDetailModalProps) {
  const { organization } = useSession()
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const [activeTab, setActiveTab] = useState<"info" | "timeline" | "customer" | "florist">("info")
  // Sale vừa ghi tên khách lên link → hiện ngay, không chờ tải lại danh sách
  const [savedCustomer, setSavedCustomer] = useState<{ key: string; customerName: string; customerPhone: string | null } | null>(null)

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "info", label: "Thông tin đơn hàng" },
    { key: "timeline", label: "Lịch sử đơn hàng" },
    { key: "customer", label: "Thẻ đơn khách hàng" },
    { key: "florist", label: orderTerms.makerTabLabel },
  ]

  if (!inputTarget) return null
  const target: OrderDetailModalTarget = savedCustomer && savedCustomer.key === inputTarget.sessionId
    ? { ...inputTarget, customerName: savedCustomer.customerName, customerPhone: savedCustomer.customerPhone }
    : inputTarget

  const isPaid = (target.paidVnd ?? 0) >= (target.totalVnd ?? 0) && (target.totalVnd ?? 0) > 0
  const isDeposit = (target.paidVnd ?? 0) > 0 && !isPaid
  const canShowFloristJob = isPaid || isDeposit

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose() }} size="lg"
        title={
          <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-title-sm font-extrabold text-text">
            {target.orderCode ? `#${target.orderCode}` : `Link ${target.sendCode}`}
          </span>
          {target.currentStepTitle && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-bold text-primary">
              {target.currentStepTitle}
            </span>
          )}
          <StaffNametagGroup
            item={{
              currentStepId: target.currentStepId ?? undefined,
              productionStatus: target.productionStatus,
              deliveryStatus: target.deliveryStatus,
              saleId: target.saleId,
              saleName: target.saleName ?? undefined,
              coordinatorId: target.coordinatorId,
              coordinatorName: target.coordinatorName ?? undefined,
            }}
          />
          </span>
        }
        description={<>Khách hàng: <strong className="text-text">{target.customerName || "Khách lẻ"}</strong></>}
        subHeader={
          <>
            {/* MỐC THỜI GIAN GIAO HÀNG / LƯU TRÚ TO NỔI BẬT */}
            <div className="border-b border-border bg-primary/5 px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Clock size={20} className="shrink-0" />
                  <div>
                    <span className="text-caption font-bold uppercase tracking-wider text-text-muted block">
                      {orderTerms.deliveryTimeLabel}
                    </span>
                    <span className="text-body font-black text-primary">
                      {target.deliveryTimeSlot || orderTerms.fallbackTimeSlotText}
                      {target.deliveryDate ? ` · Ngày ${target.deliveryDate}` : ""}
                    </span>
                  </div>
                </div>
                {target.deliveryZone && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-surface px-2.5 py-1 text-caption font-bold text-primary">
                    <MapPin size={13} />
                    {target.deliveryZone}
                  </span>
                )}
              </div>
            </div>

            {/* Tab switcher: Chi tiết · Lịch sử · Thẻ đơn khách · Thẻ gia công/chuẩn bị */}
            <div role="tablist" className="flex shrink-0 items-stretch gap-1 overflow-x-auto px-5">
              {tabs.filter((t) => t.key !== "florist" || canShowFloristJob).map((t) => (
                <Button variant="ghost"
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`py-0 gap-0 -mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-body-sm font-bold leading-none transition-colors ${
                    activeTab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </>
        }
        footer={activeTab !== "florist" ? (
          <div className="-mx-5 -my-3 flex-1 sm:-mx-6 sm:-my-3.5">
            <OrderDetailFooter target={target} onClose={onClose} onOpenNotes={onOpenNotes} onCancellationProposed={onCancellationProposed} />
          </div>
        ) : undefined}
      >
        {activeTab === "timeline" ? (
          <div className="flex flex-col gap-5">
          <OrderHistoryPanel orderId={target.orderId} sessionId={target.sessionId} />
          <EvidenceTimelineDiagram
            orderId={target.orderId}
            sessionId={target.sessionId}
            orderCode={target.orderCode}
            customerName={target.customerName}
            customerPhone={target.customerPhone}
            recipientName={target.recipientName}
            recipientPhone={target.recipientPhone}
            deliveryAddress={target.deliveryAddress}
            deliveryTimeSlot={target.deliveryTimeSlot}
            productName={target.productName}
            totalVnd={target.totalVnd}
            paidVnd={target.paidVnd}
          />
          </div>
        ) : activeTab === "customer" ? (
          <BrochureCustomerOrderTab target={target} />
        ) : activeTab === "florist" ? (
          <BrochureFloristJobTab
            target={target}
            onClose={onClose}
            onAcceptedOrRejected={onCancellationProposed}
          />
        ) : (
          <OrderDetailInfoTab target={target} onCustomerSaved={(c) => setSavedCustomer({ key: target.sessionId ?? "", ...c })} />
        )}
      </Dialog>
    </>
  )
}
