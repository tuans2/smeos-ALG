"use client"

import React, { useState } from "react"
import { useSWRConfig } from "swr"
import { RefreshCw, X } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"
import { MessageThread } from "@/components/greeting-card/inbox/message-thread"
import { BrochureOrderDetailModal } from "@/components/greeting-card/brochure-order-detail-modal"
import type { TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import { TrackingToolbar } from "./views/tracking-toolbar"
import { KanbanView } from "./views/kanban-view"
import { ListView } from "./views/list-view"
import { CalendarView } from "./views/calendar-view"
import { TimelineView } from "./views/timeline-view"
import { DashboardView } from "./views/dashboard-view"
import { codeOf } from "./views/tracking-bits"
import { COORDINATOR_DEFAULT, DEFAULT_STATE, queryString, type SavedView, type TrackingViewState } from "./views/tracking-view-state"
import { defaultTheChaoView } from "@/components/greeting-card/default-view"

import { DismissProposalModal } from "./views/dismiss-proposal-modal"
import { canDecideDismissal } from "@/modules/greeting-card/domain/dismissal-policy"

import { useSession } from "@/lib/session"
import { getIndustryOrderTerms, getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

/**
 * Tab Theo dõi tiến độ — nhiều cách xem trên CÙNG một tập đơn/link: Kanban, Danh sách, Lịch,
 * Timeline, Công việc, Dashboard. Bộ lọc và phạm vi dùng chung; máy chủ lọc/nhóm/phân trang.
 */
export function BrochureOrderTrackingTab() {
  const { organization } = useSession()
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const terms = getIndustryTerminology(organization?.industry)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"
  const me = useApi<{ user: { id: string }; capabilities: string[] }>("/api/v1/auth/me")
  const { mutate } = useSWRConfig()
  const [picked, setPicked] = useState<TrackingViewState | null>(null)
  const [notesFor, setNotesFor] = useState<TrackingViewItem | null>(null)
  const [detailFor, setDetailFor] = useState<TrackingViewItem | null>(null)
  const [dismissFor, setDismissFor] = useState<TrackingViewItem | null>(null)

  const capabilities = me.data?.capabilities ?? []
  // Điều hành / Admin có quyền duyệt bỏ hiển thị và thao tác quản trị
  // /auth/me trả MÃ quyền (R4…), không phải tên — so tên thì nút duyệt không bao giờ hiện
  const canDecide = canDecideDismissal(capabilities)
  // Điều phối (vai mở thẳng bảng Điều phối) vào tab này thấy ngay việc của mình; bấm bỏ lọc để xem cả tập
  const isCoordinator = me.data ? defaultTheChaoView((c) => capabilities.includes(c)).activeTab === "coordinator" : false
  const initial: TrackingViewState = isCoordinator ? { ...DEFAULT_STATE, ...COORDINATOR_DEFAULT } : DEFAULT_STATE
  const state = picked ?? initial
  const setState = (next: (s: TrackingViewState) => TrackingViewState) => setPicked((prev) => next(prev ?? initial))

  const change = (patch: Partial<TrackingViewState>) => setState((s) => ({ ...s, ...patch }))
  const applyView = (v: SavedView) =>
    setState((s) => ({ ...DEFAULT_STATE, columns: s.columns, ...v.state, ...(v.scope === "me" && me.data ? { saleId: me.data.user.id } : {}) }))
  // Mở một đơn: hiện Thẻ đơn hàng (lịch sử nằm trong tab "Lịch sử đơn hàng" của thẻ)
  const open = (i: TrackingViewItem) => setDetailFor(i)
  const refresh = () => void mutate((key) => typeof key === "string" && key.includes("/api/v1/greeting-card/tracking") || (Array.isArray(key) && String(key[0]).includes("/api/v1/greeting-card/tracking")))

  // Lịch tự chọn khoảng ngày; bộ lọc ngày giao chỉ gửi kèm khi không xem lịch
  const qs = queryString(state.view === "calendar" ? { ...state, deliveryFrom: "", deliveryTo: "" } : state)

  return (
    <div className="flex flex-col gap-4">
      <TrackingToolbar state={state} onChange={change} onApplyView={applyView} onRefresh={refresh} />
      {state.owner === "COORDINATOR" && (
        <div className="flex items-center gap-2 text-caption text-text-muted">
          <span>
            {isStay
              ? "Đang xem việc của Điều phối (nhận đơn, chuẩn bị phòng, đón khách)."
              : `Đang xem việc của Điều phối (nhận đơn, ${terms.makerAction.toLowerCase()}, giao hàng).`}
          </span>
          <Button variant="outline" type="button" onClick={() => change({ owner: "" })}
            className="py-0 text-[length:inherit] inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 font-bold text-text hover:bg-surface-alt">
            <X size={13} aria-hidden="true" /> Xem tất cả đơn và link
          </Button>
        </div>
      )}

      {state.view === "kanban" && (
        <KanbanView
          qs={qs}
          onOpen={open}
          canDecide={canDecide}
          onDismiss={(item) => setDismissFor(item)}
        />
      )}
      {state.view === "list" && <ListView qs={qs} state={state} onChange={change} onOpen={open} onDetail={(i) => setDetailFor(i)} />}
      {state.view === "queue" && <ListView qs={qs} state={state} onChange={change} onOpen={open} onDetail={(i) => setDetailFor(i)} view="queue" />}
      {state.view === "calendar" && <CalendarView qs={qs} from={state.deliveryFrom} to={state.deliveryTo} onOpen={open} />}
      {state.view === "timeline" && (
        <TimelineView
          qs={qs}
          state={state}
          onChange={change}
          onOpen={open}
        />
      )}
      {state.view === "dashboard" && <DashboardView qs={qs} />}

      {notesFor && (
        <MessageThread
          target={{ orderId: notesFor.orderId, sessionId: notesFor.sessionId }}
          stepKey="GENERAL"
          title={`${notesFor.customerName} · ${codeOf(notesFor)}`}
          onClose={() => setNotesFor(null)}
        />
      )}

      {detailFor && (
        <BrochureOrderDetailModal
          target={{
            orderId: detailFor.orderId,
            sessionId: detailFor.sessionId,
            orderCode: detailFor.orderCode,
            sendCode: detailFor.sendCode,
            customerName: detailFor.customerName,
            customerPhone: detailFor.customerPhone,
            recipientName: detailFor.recipientName,
            recipientPhone: detailFor.recipientPhone,
            deliveryAddress: detailFor.deliveryAddress,
            deliveryDate: detailFor.deliveryDate,
            deliveryTimeSlot: detailFor.deliveryTimeSlot,
            deliveryZone: detailFor.deliveryZone,
            cardMessage: detailFor.cardMessage,
            productName: detailFor.productName,
            productImageUrl: detailFor.productImageUrl,
            totalVnd: detailFor.totalVnd,
            paidVnd: detailFor.paidVnd,
            balanceVnd: detailFor.balanceVnd,
            saleId: detailFor.saleId,
            saleName: detailFor.saleName,
            coordinatorId: detailFor.coordinatorId,
            coordinatorName: detailFor.coordinatorName,
            currentStepId: detailFor.currentStepId,
            currentStepTitle: detailFor.currentStepTitle,
            status: detailFor.orderStatus,
            productionStatus: detailFor.productionStatus,
            deliveryStatus: detailFor.deliveryStatus,
            paymentProofUrl: detailFor.paymentProofUrl,
            paymentProofBalanceUrl: detailFor.paymentProofBalanceUrl,
            customerReportedPaid: Boolean(detailFor.customerReportedPaid || detailFor.paymentProofBalanceUrl),
            createdAt: detailFor.createdAt, copiedAt: detailFor.copiedAt, openedAt: detailFor.openedAt, lastActiveAt: detailFor.lastActiveAt,
          }}

          onClose={() => setDetailFor(null)}
          onOpenNotes={() => {
            setNotesFor(detailFor)
            setDetailFor(null)
          }}
        />
      )}

      {dismissFor && (
        <DismissProposalModal
          item={dismissFor}
          onClose={() => setDismissFor(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

