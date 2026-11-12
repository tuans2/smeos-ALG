"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { ChevronDown, Plus, RefreshCw, Search, X } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi, usePagedList } from "@/components/greeting-card/greeting-api"
import { WorkItemCard } from "@/components/greeting-card/work/work-item-card"
import { useNow, useWorklist } from "@/components/greeting-card/work/use-worklist"
import { MessageThread } from "@/components/greeting-card/inbox/message-thread"
import { BrochureOrderDetailModal, type OrderDetailModalTarget } from "@/components/greeting-card/brochure-order-detail-modal"
import { WORK_BUCKET_LABEL, sortWorklist, workBucket, type WorkBucket } from "@/modules/greeting-card/domain/worklist"
import type { TrackingPipelineItem, TrackingPipelineStepId } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import { SalesSessionTable } from "./sales-session-table"
import { SalesKanbanView } from "./sales-kanban-view"
import { SalesCreateLinkModal } from "./sales-create-link-modal"
import type { CatalogOption, SessionRow } from "./sales-types"

interface SalesBrochureTabProps {
  initialOpenCreate?: boolean
  onNavigateToCatalog?: () => void
}

const BUCKETS: WorkBucket[] = ["ACTION", "WAITING_CUSTOMER", "IN_PROGRESS", "DONE", "CANCELLED"]

/** Tab Sale: trạng thái từng khách của mình là trọng tâm; việc kẹt cần sale tác động lên đầu. */
export function SalesBrochureTab({ initialOpenCreate = false, onNavigateToCatalog }: SalesBrochureTabProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(initialOpenCreate)
  const [scope, setScope] = useState<"MINE" | "ALL">("MINE")
  const [bucket, setBucket] = useState<WorkBucket | null>(null)
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [search, setSearch] = useState("")
  const [detailTarget, setDetailTarget] = useState<OrderDetailModalTarget | null>(null)
  const [linksOpen, setLinksOpen] = useState(false)
  const [notesFor, setNotesFor] = useState<{ item: TrackingPipelineItem; stepId: TrackingPipelineStepId | "GENERAL" } | null>(null)
  const work = useWorklist()
  const now = useNow()
  const sessions = usePagedList<SessionRow>(linksOpen ? "/api/v1/greeting-card/send-links" : null)
  const catalogs = useApi<{ data: CatalogOption[] }>("/api/v1/greeting-card/catalogs")
  const catalogList = catalogs.data?.data ?? []

  // Máy chủ đã lọc theo quyền Điều hành cấp; thấy khách của sale khác = được xem "Tất cả"
  const canSeeAll = work.items.some((i) => i.saleId !== work.userId)
  const scoped = scope === "MINE" || !canSeeAll ? work.items.filter((i) => i.saleId === work.userId) : work.items

  const term = search.trim().toLowerCase()
  const cleanTerm = term.replace(/^#/, "")
  const termDigits = term.replace(/\D/g, "")
  const hasLetters = /[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(term)
  const matchesSearch = (i: TrackingPipelineItem) => {
    if (!term) return true
    const phoneDigits = (i.customerPhone || "").replace(/\D/g, "")
    const recipientDigits = (i.recipientPhone || "").replace(/\D/g, "")
    const phoneMatch = !hasLetters && termDigits.length >= 3 && (phoneDigits.includes(termDigits) || recipientDigits.includes(termDigits))
    const textMatch = [
      i.orderCode,
      i.sendCode,
      i.customerName,
      i.customerPhone,
      i.recipientName,
      i.recipientPhone,
      i.productName,
    ].some((v) => v?.toLowerCase().includes(term) || (cleanTerm && v?.toLowerCase().includes(cleanTerm)))
    return phoneMatch || textMatch
  }

  const filtered = term ? scoped.filter(matchesSearch) : scoped
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, filtered.filter((i) => workBucket(i, "SALE") === b).length])) as Record<WorkBucket, number>
  const shown = sortWorklist(
    term
      ? filtered
      : bucket
        ? filtered.filter((i) => workBucket(i, "SALE") === bucket)
        : filtered.filter((i) => workBucket(i, "SALE") !== "DONE" && workBucket(i, "SALE") !== "CANCELLED"),
    "SALE",
  )
  const openNotes = (item: TrackingPipelineItem, stepId?: TrackingPipelineStepId) => setNotesFor({ item, stepId: stepId ?? "GENERAL" })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title font-extrabold text-text">Khách của tôi</h2>
          <p className="mt-1 text-body-sm text-text-muted">Theo dõi từng khách đang ở bước nào; đơn cần bạn nhắc khách được đưa lên đầu.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void work.refresh()} className="h-9 gap-1.5 text-caption">
            <RefreshCw size={14} aria-hidden="true" /> Làm mới
          </Button>
          <Button type="button" size="sm" onClick={() => setIsModalOpen(true)} className="h-9 gap-1.5 bg-primary text-body-sm font-bold text-white hover:bg-primary-dark">
            <Plus size={16} aria-hidden="true" /> Tạo link mới
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {canSeeAll && (
            <div role="group" aria-label="Phạm vi khách" className="mr-2 inline-flex rounded-xl border border-border bg-surface-alt p-1">
              {(["MINE", "ALL"] as const).map((s) => (
                <Button variant="ghost" key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)}
                  className={`py-0 gap-0 h-8 rounded-lg px-3 text-caption font-bold ${scope === s ? "bg-surface text-primary shadow-xs hover:bg-surface" : "text-text-muted"}`}>
                  {s === "MINE" ? "Khách của tôi" : "Tất cả khách"}
                </Button>
              ))}
            </div>
          )}
          {BUCKETS.map((b) => (
            <Button variant="outline" key={b} type="button" aria-pressed={bucket === b} onClick={() => setBucket(bucket === b ? null : b)}
              className={`py-0 gap-0 h-9 rounded-xl border px-3 text-caption font-bold ${
                bucket === b ? "border-primary bg-primary text-white hover:bg-primary" : b === "ACTION" && counts.ACTION > 0 ? "border-danger/40 bg-danger-bg text-danger hover:bg-danger-bg" : "border-border text-text-muted hover:bg-surface-alt"
              }`}>
              {WORK_BUCKET_LABEL[b]} ({counts[b]})
            </Button>
          ))}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Tìm kiếm theo tên khách, mã đơn, số điện thoại"
              placeholder="Tìm tên khách, mã đơn, SĐT…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-surface pl-9 pr-8 text-caption text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden"
            />
            {search && (
              <Button variant="ghost"
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setSearch("")}
                className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={13} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        <div role="group" aria-label="Cách xem" className="flex items-center rounded-xl border border-border bg-surface p-1">
          {(["kanban", "list"] as const).map((v) => (
            <Button variant="ghost" key={v} type="button" aria-pressed={viewMode === v} onClick={() => setViewMode(v)}
              className={`h-auto gap-0 rounded-lg px-3 py-1 text-caption font-bold transition-colors ${viewMode === v ? "bg-primary text-white hover:bg-primary" : "text-text-muted hover:text-text"}`}>
              {v === "kanban" ? "Kanban" : "Danh sách thẻ"}
            </Button>
          ))}
        </div>
      </div>

      {work.error ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-body-sm text-danger">{work.error.message}</p>
      ) : work.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-48 animate-pulse motion-reduce:animate-none rounded-2xl bg-surface-alt" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-body-sm text-text-muted flex flex-col items-center gap-2">
          <p>
            {term ? `Không tìm thấy đơn hoặc link nào phù hợp với "${search.trim()}".` : bucket ? "Không có khách nào trong mục này." : "Chưa có khách nào đang theo dõi. Tạo link mới để gửi khách."}
          </p>
          {term && scope === "MINE" && canSeeAll && work.items.some(matchesSearch) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScope("ALL")}
              className="text-caption font-bold"
            >
              Tìm thấy trong &ldquo;Tất cả khách&rdquo; — Chuyển xem tất cả
            </Button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        <SalesKanbanView items={shown} now={now} onOpenNotes={openNotes} showSale={scope === "ALL" && canSeeAll} doneHidden={bucket === null && !term} />
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((item) => (
            <WorkItemCard
              key={item.id}
              item={item}
              me="SALE"
              now={now}
              onOpenNotes={openNotes}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDetailTarget({
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
                  }
                  className="h-9 text-caption font-bold"
                >
                  Chi tiết
                </Button>
              }
            />
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <Button variant="ghost" type="button" aria-expanded={linksOpen} onClick={() => setLinksOpen((v) => !v)}
          className="h-auto gap-0 flex w-full items-center justify-between p-4 text-left text-body font-extrabold text-text hover:bg-surface-alt">
          Link đã gửi (thu hồi, mở lại)
          <ChevronDown size={18} aria-hidden="true" className={linksOpen ? "rotate-180" : ""} />
        </Button>
        {linksOpen && (sessions.error ? (
          <p role="alert" className="p-4 text-body-sm text-danger">{sessions.error.message}</p>
        ) : (
          <SalesSessionTable
            sessions={sessions.items}
            hasMore={sessions.hasMore}
            isLoadingMore={sessions.isLoadingMore}
            onLoadMore={() => void sessions.loadMore()}
            onChanged={() => void sessions.refresh()}
            emptyState={<p className="p-6 text-center text-body-sm text-text-muted">Chưa có link nào.</p>}
          />
        ))}
      </section>

      {isModalOpen && (
        <SalesCreateLinkModal
          catalogs={catalogList}
          onClose={() => setIsModalOpen(false)}
          onCreated={() => { void work.refresh(); void sessions.refresh() }}
          onNavigateToCatalog={onNavigateToCatalog}
        />
      )}
      {notesFor && (
        <MessageThread
          target={{ orderId: notesFor.item.orderId, sessionId: notesFor.item.sessionId }}
          stepKey={notesFor.stepId}
          title={`${notesFor.item.customerName} · ${notesFor.item.orderCode ? `Đơn ${notesFor.item.orderCode}` : `Link ${notesFor.item.sendCode}`}`}
          onClose={() => setNotesFor(null)}
        />
      )}
      {detailTarget && (
        <BrochureOrderDetailModal
          target={detailTarget}
          onClose={() => setDetailTarget(null)}
          onOpenNotes={(t) => {
            const found = scoped.find((x) => (t.orderId ? x.orderId === t.orderId : x.sessionId === t.sessionId))
            if (found) openNotes(found)
            setDetailTarget(null)
          }}
        />
      )}
    </div>
  )
}
