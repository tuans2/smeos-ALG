"use client"

import React, { useCallback, useEffect, useState } from "react"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { CoordinatorOrderBriefCard } from "@/components/templates/coordinator/coordinator-order-brief-card"
import { SalesOrderIntakeModal } from "./sales-order-intake-modal"
import {
  coordinatorApi,
  errorMessage,
  isStageAdvanceLocked, type CoordinationOrder,
  type CreateOrderRequest,
} from "./coordinator-api"
import { useCustomFieldDefinitions, visibleCustomFieldsForAudience } from "./custom-fields-section"
import { useCraftFeeSuggestion } from "@/components/greeting-card/subcontract/use-craft-fee-suggestion"
import { CoordinatorKpiSummary } from "./coordinator-kpi-summary"
import { CoordinatorToolbar } from "./coordinator-toolbar"
import {
  CoordinatorOrderDetailModal,
  asAddress,
  fmtVnd,
  type DetailTab,
} from "./coordinator-order-detail-modal"
import { CoordinatorActionModals } from "./coordinator-action-modals"
import { useCoordinatorActions } from "./use-coordinator-actions"

const REFRESH_MS = 60_000

export interface ControlTowerDashboardProps {
  isCreateOpen?: boolean | undefined
  setIsCreateOpen?: ((open: boolean) => void) | undefined
  isCreateModalOpen?: boolean | undefined
  onOpenCreateModal?: (() => void) | undefined
  onCloseCreateModal?: (() => void) | undefined
}

export function ControlTowerDashboard({
  isCreateOpen,
  setIsCreateOpen,
  isCreateModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
}: ControlTowerDashboardProps = {}) {
  const [orders, setOrders] = useState<CoordinationOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [detailModalTab, setDetailModalTab] = useState<DetailTab>("BRIEF")
  const [internalIsCreateOpen, setInternalIsCreateOpen] = useState(false)
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isProductionUpdateModalOpen, setIsProductionUpdateModalOpen] = useState(false)
  const [isQcModalOpen, setIsQcModalOpen] = useState(false)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isCraftAcceptModalOpen, setIsCraftAcceptModalOpen] = useState(false)
  const [isCraftCancelModalOpen, setIsCraftCancelModalOpen] = useState(false)
  const [suggestedFeeForAccept, setSuggestedFeeForAccept] = useState(0)
  const craftFeeSuggestion = useCraftFeeSuggestion(selectedId)
  const [partners, setPartners] = useState<import("./coordinator-api").CoordinationPartner[]>([])

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null
  const orderCustomFieldDefs = useCustomFieldDefinitions("ORDER")
  const partnerVisibleCustomFields = selectedOrder
    ? visibleCustomFieldsForAudience(selectedOrder.customFields, orderCustomFieldDefs ?? [], "PARTNER")
    : []

  const refresh = useCallback(() => {
    coordinatorApi
      .listOrders()
      .then((list) => {
        setOrders(list)
        setLoadError(null)
      })
      .catch((error: unknown) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false))

    coordinatorApi
      .listPartners()
      .then((partnerList) => setPartners(partnerList))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0)
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [refresh])

  const applyUpdate = (order: CoordinationOrder) => {
    setOrders((prev) => {
      const i = prev.findIndex((p) => p.id === order.id)
      if (i < 0) return [order, ...prev]
      const next = [...prev]
      next[i] = order
      return next
    })
    setSelectedId(order.id)
  }

  const effectiveIsCreateOpen =
    isCreateOpen !== undefined
      ? isCreateOpen
      : isCreateModalOpen !== undefined
      ? isCreateModalOpen
      : internalIsCreateOpen

  const handleCloseCreate = () => {
    if (setIsCreateOpen) setIsCreateOpen(false)
    setInternalIsCreateOpen(false)
    onCloseCreateModal?.()
  }

  const openDetail = (order: CoordinationOrder, tab: DetailTab = "BRIEF") => {
    setSelectedId(order.id)
    setDetailModalTab(tab)
    setIsDetailOpen(true)
  }

  const handleCreateOrder = async (body: CreateOrderRequest, depositVnd: number) => {
    let order = await coordinatorApi.createOrder(body)
    if (depositVnd > 0) {
      try {
        order = await coordinatorApi.recordPayment(order.id, { kind: "DEPOSIT", amountVnd: depositVnd })
      } catch (e) {
        applyUpdate(order)
        setNotice(`Đã tạo đơn #${order.orderCode}, nhưng ghi cọc thất bại: ${errorMessage(e)} — vào Sổ thu để ghi lại.`)
        return
      }
    }
    applyUpdate(order)
    setNotice(depositVnd > 0 ? `Đã tạo đơn #${order.orderCode} và ghi cọc ${fmtVnd(depositVnd)}.` : `Đã tạo đơn #${order.orderCode}.`)
  }

  const actions = useCoordinatorActions({
    selectedOrder,
    setSelectedId,
    applyUpdate,
    openDetail,
    setNotice,
    setIsPlanningModalOpen,
    setIsAssignModalOpen,
    setIsProductionUpdateModalOpen,
    setIsQcModalOpen,
    setIsDispatchModalOpen,
    setIsClosureModalOpen,
    setIsCraftAcceptModalOpen,
    setIsCraftCancelModalOpen,
  })

  const filteredOrders = orders.filter((o) => {
    if (activeTab !== "ALL") {
      if (activeTab === "INTAKE" && o.stage !== "INTAKE" && o.stage !== "VALIDATING") return false
      if (activeTab === "PLANNING" && o.stage !== "PLANNING" && o.stage !== "ASSIGNING") return false
      if (activeTab === "IN_PRODUCTION" && o.stage !== "IN_PRODUCTION") return false
      if (activeTab === "QUALITY_CHECK" && o.stage !== "QUALITY_CHECK") return false
      if (activeTab === "DISPATCHING" && o.stage !== "DISPATCHING") return false
      if (activeTab === "DELIVERED" && o.stage !== "DELIVERED" && o.stage !== "COMPLETED") return false
      if (activeTab === "EXCEPTION" && !o.hasException && o.stage !== "EXCEPTION") return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const addr = asAddress(o.deliveryAddress)
      const addrStr = (typeof addr === "string" ? addr : [addr.street, addr.ward, addr.district, addr.city].join(" ")).toLowerCase()
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.recipientName.toLowerCase().includes(q) ||
        o.productTitle.toLowerCase().includes(q) ||
        addrStr.includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div role="status" className="p-3 rounded-xl border border-primary/30 bg-primary/10 text-primary text-caption font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <Button size="sm" variant="ghost" onClick={() => setNotice(null)} aria-label="Đóng thông báo" className="text-text-muted hover:text-text h-6 w-6 p-0">
            <X size={14} />
          </Button>
        </div>
      )}

      {loadError && (
        <div role="alert" className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-caption font-semibold flex items-center justify-between">
          <span>Lỗi tải đơn điều phối: {loadError}</span>
          <Button size="sm" variant="outline" onClick={refresh} className="text-caption font-bold border-danger/40 h-7 px-2">
            Thử lại
          </Button>
        </div>
      )}

      <CoordinatorKpiSummary orders={orders} />

      <FeatureGuidanceCard
        badgeLabel="SaaS Tầng 2 • ChainOS"
        title="Tháp Vận Hành Điều Phối & Giám Sát Đơn Hàng Vận Hành"
        description="Quản lý toàn bộ tiến trình từ thẩm định đơn, phân công đối tác xưởng ngoài, AI QC kiểm định chất lượng đến trao hàng tận tay người nhận (POD)."
        tips={[
          "⚡ Một Đơn Hàng Duy Nhất (SSOT): Tự động đồng bộ với 11 chức năng còn lại",
          "🎯 Công thức chế tác: Đối tác nhìn thấy chính xác danh sách nguyên liệu từ đơn",
          "🤖 AI QC ảnh: So khớp ảnh thành phẩm của thợ với ảnh mẫu trước khi cho phép giao",
          "📋 28 Templates chuẩn hóa: T01 (Tiếp nhận) ➔ T02-T06 (Kế hoạch & Phân công) ➔ T07-T11 (Chế tác) ➔ T14-T15 (AI QC) ➔ T20-T21 (POD) ➔ T25-T27 (Đóng đơn)",
        ]}
      />

      <CoordinatorToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loading={loading}
        onRefresh={refresh}
        onOpenCreate={() => (setIsCreateOpen ? setIsCreateOpen(true) : setInternalIsCreateOpen(true))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((ord) => (
            <CoordinatorOrderBriefCard
              key={ord.id}
              orderCode={ord.orderCode}
              stageLabel={ord.stageLabel}
              stage={ord.stage}
              customerName={ord.customerName}
              customerTier={ord.customerTier}
              recipientName={ord.recipientName}
              recipientPhone={ord.recipientPhone}
              deliveryAddress={asAddress(ord.deliveryAddress)}
              deliveryTargetTime={ord.deliveryTargetTime}
              nextAction={ord.nextAction}
              productTitle={ord.productTitle}
              sampleImageUrl={ord.sampleImageUrl}
              partnerName={ord.partnerName ?? undefined}
              riskLevel={ord.riskLevel}
              riskReason={ord.riskReason}
              hasMissingItems={false}
              onOpenDetail={() => openDetail(ord, "BRIEF")}
              {...(isStageAdvanceLocked(ord)
                ? {}
                : { onAdvanceStage: () => actions.handleAdvanceStage(ord) })}
              onOpenAssignModal={() => {
                setSelectedId(ord.id)
                setIsAssignModalOpen(true)
              }}
              onOpenProduction={() => {
                setSelectedId(ord.id)
                setIsProductionUpdateModalOpen(true)
              }}
              onOpenQC={() => {
                setSelectedId(ord.id)
                setIsQcModalOpen(true)
              }}
              onOpenPOD={() => {
                setSelectedId(ord.id)
                setIsDispatchModalOpen(true)
              }}
              onOpenClosure={() => {
                setSelectedId(ord.id)
                setIsClosureModalOpen(true)
              }}
            />
          ))
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border text-caption text-text-muted col-span-full">
            {orders.length === 0 ? "Chưa có đơn điều phối nào — bấm “Tiếp nhận đơn” để tạo đơn đầu tiên." : "Không có đơn nào khớp bộ lọc."}
          </div>
        )}
      </div>

      {selectedOrder && (
        <CoordinatorOrderDetailModal
          isOpen={isDetailOpen}
          order={selectedOrder}
          initialTab={detailModalTab}
          partnerVisibleCustomFields={partnerVisibleCustomFields}
          suggestedFeeVnd={craftFeeSuggestion?.suggestedVnd}
          onClose={() => setIsDetailOpen(false)}
          onUpdate={applyUpdate}
          onAdvanceStage={actions.handleAdvanceStage}
          onOpenAssignModal={() => setIsAssignModalOpen(true)}
          onOpenProductionModal={() => setIsProductionUpdateModalOpen(true)}
          onOpenQcModal={() => setIsQcModalOpen(true)}
          onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
          onOpenClosureModal={() => setIsClosureModalOpen(true)}
          onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
          onConfirmAcceptance={(fee) => {
            setSuggestedFeeForAccept(fee)
            setIsCraftAcceptModalOpen(true)
          }}
          onCancelFloristOrder={() => setIsCraftCancelModalOpen(true)}
        />
      )}

      <SalesOrderIntakeModal isOpen={effectiveIsCreateOpen} onClose={handleCloseCreate} onSubmit={handleCreateOrder} />

      <CoordinatorActionModals
        order={selectedOrder}
        partners={partners}
        suggestedFeeForAccept={suggestedFeeForAccept}
        craftFeeSuggestionVnd={craftFeeSuggestion?.suggestedVnd}
        isPlanningModalOpen={isPlanningModalOpen}
        isAssignModalOpen={isAssignModalOpen}
        isProductionUpdateModalOpen={isProductionUpdateModalOpen}
        isQcModalOpen={isQcModalOpen}
        isDispatchModalOpen={isDispatchModalOpen}
        isClosureModalOpen={isClosureModalOpen}
        isPaymentModalOpen={isPaymentModalOpen}
        isCraftAcceptModalOpen={isCraftAcceptModalOpen}
        isCraftCancelModalOpen={isCraftCancelModalOpen}
        onClosePlanning={() => setIsPlanningModalOpen(false)}
        onCloseAssign={() => setIsAssignModalOpen(false)}
        onCloseProductionUpdate={() => setIsProductionUpdateModalOpen(false)}
        onCloseQc={() => setIsQcModalOpen(false)}
        onCloseDispatch={() => setIsDispatchModalOpen(false)}
        onCloseClosure={() => setIsClosureModalOpen(false)}
        onClosePayment={() => setIsPaymentModalOpen(false)}
        setIsCraftAcceptModalOpen={setIsCraftAcceptModalOpen}
        setIsCraftCancelModalOpen={setIsCraftCancelModalOpen}
        onConfirmPlan={actions.onConfirmPlan}
        onAssignPartner={actions.onAssignPartner}
        onProductionUpdate={actions.onProductionUpdate}
        onQc={actions.onQc}
        onDelivery={actions.onDelivery}
        onCloseOrder={actions.onCloseOrder}
        onRecordPayment={applyUpdate}
        onCraftAccept={actions.onCraftAccept}
        onCraftCancel={actions.onCraftCancel}
      />
    </div>
  )
}
