"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { ViDateInput } from "@/components/greeting-card/customer/vi-date-input"
import { RefreshCw, Search, Sparkles, X } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { CoordinatorActionModal } from "./coordinator-action-modal"
import { CoordinatorOrderCard, type BrochureOrder, type ModalState } from "./coordinator-order-card"
import { CoordinatorKanbanView } from "./coordinator-kanban-view"
import { useApi } from "@/components/greeting-card/greeting-api"
import { PendingCancellationPanel } from "@/components/greeting-card/admin/pending-cancellation-panel"
import { parsePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { canBypassDeliveryPhoto, canBypassFinishedPhoto, parseBrochureWorkflowPolicy } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { useCoordinatorWork, useNow } from "@/components/greeting-card/work/use-worklist"
import { WORK_BUCKET_LABEL, workBucket, type WorkBucket } from "@/modules/greeting-card/domain/worklist"
import { BrochureOrderDetailModal } from "@/components/greeting-card/brochure-order-detail-modal"

// Điều phối chỉ lo đơn đã đặt: không có nhóm "Đang chờ khách"
const BUCKETS: WorkBucket[] = ["ACTION", "IN_PROGRESS", "DONE"]

/** Ngày theo giờ Việt Nam (YYYY-MM-DD), lệch `addDays` ngày. */
function vnDate(addDays = 0): string {
  return new Date(Date.now() + addDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
}

export function CoordinatorBrochureTab({ canDecideInTransitCancel = false }: { canDecideInTransitCancel?: boolean } = {}) {
  // Bảng việc: MỌI đơn còn việc (không cắt trang), máy chủ đã xếp theo ngày + giờ giao gần nhất
  const [day, setDay] = useState<string>("")
  const [search, setSearch] = useState<string>("")
  const term = search.trim().toLowerCase()
  const cleanTerm = term.replace(/^#/, "")
  const termDigits = term.replace(/\D/g, "")
  // Khi đang tìm kiếm: quét trên toàn bộ đơn của xưởng (không giới hạn ngày đang chọn)
  const board = useApi<{ data: BrochureOrder[]; truncated: boolean }>(
    `/api/v1/greeting-card/coordinator-board${term ? "" : day ? `?date=${day}` : ""}`,
    { refreshInterval: 30_000 },
  )
  const orders = board.data?.data ?? []
  const loading = board.isLoading
  const loadOrders = () => void board.mutate()
  const org = useApi<{ type?: string; settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const policy = parsePaymentPolicy(org.data?.settings)
  const workflowPolicy = parseBrochureWorkflowPolicy(org.data?.settings, org.data?.type)
  const [modal, setModal] = useState<ModalState>({ type: "none" })
  const openModal = (m: ModalState) => setModal(m)
  const [bucket, setBucket] = useState<WorkBucket | null>(null)
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban")
  const work = useCoordinatorWork()
  const now = useNow()
  const workOf = new Map(work.items.filter((i) => i.orderId).map((i) => [i.orderId as string, i]))
  const hasPendingBypass = (o: BrochureOrder): boolean => {
    const reqs = o.gate2?.bypassRequests
    if (!reqs) return false
    return Object.values(reqs).some((r) => r && r.status === "PENDING")
  }

  const bucketOf = (o: BrochureOrder): WorkBucket => {
    // Đơn có yêu cầu bỏ qua bằng chứng đang chờ duyệt -> BẮT BUỘC lên nhóm "Cần tôi làm" (ACTION)
    if (hasPendingBypass(o)) return "ACTION"

    const w = workOf.get(o.id)
    const b = w ? workBucket(w, "COORDINATOR") : "IN_PROGRESS"
    return b === "WAITING_CUSTOMER" ? "IN_PROGRESS" : b
  }

  const hasLetters = /[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(term)
  const matchesSearch = (o: BrochureOrder) => {
    if (!term) return true
    const phoneDigits = (o.customer?.phone || "").replace(/\D/g, "")
    const recipientDigits = (o.delivery_address?.phone || "").replace(/\D/g, "")
    const phoneMatch = !hasLetters && termDigits.length >= 3 && (phoneDigits.includes(termDigits) || recipientDigits.includes(termDigits))
    const textMatch = [
      o.code,
      o.greeting_sessions?.[0]?.send_code,
      o.customer?.name,
      o.customer?.phone,
      o.delivery_address?.recipientName,
      o.delivery_address?.phone,
      o.items?.[0]?.description,
      o.product.name,
    ].some((v) => v?.toLowerCase().includes(term) || (cleanTerm && v?.toLowerCase().includes(cleanTerm)))
    return phoneMatch || textMatch
  }

  const filtered = term ? orders.filter(matchesSearch) : orders
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, filtered.filter((o) => bucketOf(o) === b).length])) as Record<WorkBucket, number>
  // Giữ thứ tự giờ giao của máy chủ; Lưới thẻ mặc định ẩn đơn đã xong trừ khi đang tìm kiếm.
  // Kanban luôn có đơn giao trong 24 giờ ở cột "Đã giao" (thu gọn) — trước đây cột này luôn trống
  const shown = term
    ? filtered
    : orders.filter((o) => (bucket ? bucketOf(o) === bucket : viewMode === "kanban" || bucketOf(o) !== "DONE"))
  const dayChips: Array<{ id: string; label: string }> = [
    { id: "", label: "Mọi ngày" },
    { id: vnDate(0), label: "Hôm nay" },
    { id: vnDate(1), label: "Ngày mai" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Đề xuất huỷ đơn đang giao — Điều phối được duyệt (PO 15/10/2026) */}
      {canDecideInTransitCancel && <PendingCancellationPanel />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-title font-extrabold text-text">Việc của Điều phối</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Đơn xếp theo ngày và giờ giao gần nhất. Mỗi tác vụ cập nhật bước của đơn — khách tự thấy trên link theo dõi.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => { loadOrders(); void work.refresh() }} className="gap-1.5 text-caption h-9">
          <RefreshCw size={14} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
          <span>Làm mới</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc việc">
            {BUCKETS.map((b) => (
              <Button variant="outline" key={b} type="button" aria-pressed={bucket === b} onClick={() => setBucket(bucket === b ? null : b)}
                className={`py-0 gap-0 h-9 rounded-xl border px-3 text-caption font-bold ${
                  bucket === b ? "border-primary bg-primary text-white hover:bg-primary" : b === "ACTION" && counts.ACTION > 0 ? "border-danger/40 bg-danger-bg text-danger hover:bg-danger-bg" : "border-border text-text-muted hover:bg-surface-alt"
                }`}>
                {WORK_BUCKET_LABEL[b]} ({counts[b]})
              </Button>
            ))}
          </div>

          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Tìm kiếm đơn hàng theo tên khách, mã đơn, số điện thoại"
              placeholder="Tìm tên khách, mã đơn, SĐT…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-surface pl-9 pr-8 text-caption text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ngày giao">
            {term ? (
              <span className="text-caption font-semibold text-text-muted italic px-2">
                (Đang tìm trên mọi ngày)
              </span>
            ) : (
              <>
                {dayChips.map((c) => (
                  <Button variant="outline" key={c.label} type="button" aria-pressed={day === c.id} onClick={() => setDay(c.id)}
                    className={`py-0 gap-0 h-9 rounded-xl border px-3 text-caption font-bold ${day === c.id ? "border-primary bg-primary text-white hover:bg-primary" : "border-border text-text-muted hover:bg-surface-alt"}`}>
                    {c.label}
                  </Button>
                ))}
                <ViDateInput compact ariaLabel="Chọn ngày giao" value={day} onChange={setDay} wrapperClassName="w-36"
                  className="h-9 rounded-xl border border-border bg-surface px-2 text-caption text-text" />
              </>
            )}
          </div>

          {/* View Mode Toggle (Spec #14) */}
          <div className="flex items-center rounded-xl border border-border bg-surface p-1">
            <Button variant="ghost"
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`h-auto gap-0 px-3 py-1 text-caption font-bold rounded-lg transition-colors ${
                viewMode === "kanban" ? "bg-primary text-white hover:bg-primary" : "text-text-muted hover:text-text"
              }`}
            >
              Kanban
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setViewMode("grid")}
              className={`h-auto gap-0 px-3 py-1 text-caption font-bold rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-primary text-white hover:bg-primary" : "text-text-muted hover:text-text"
              }`}
            >
              Lưới thẻ
            </Button>
          </div>
        </div>
      </div>

      {/* Orders View */}
      {shown.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center text-text-muted flex flex-col items-center">
          <Sparkles size={36} className="text-primary/40 mb-2" />
          <p className="text-body font-bold text-text">
            {term ? `Không tìm thấy đơn nào phù hợp với "${search.trim()}"` : bucket ? "Không có đơn nào trong mục này" : "Chưa có đơn nào cần làm"}
          </p>
          <p className="text-caption text-text-muted mt-1">
            {term ? "Thử tìm theo tên khách, mã đơn khác hoặc số điện thoại." : "Khi khách đặt hoa qua bộ sưu tập riêng, đơn sẽ hiển thị ngay tại đây."}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <CoordinatorKanbanView
          orders={shown}
          policy={policy}
          onOpen={openModal}
          workOf={workOf}
          now={now}
          workflowPolicy={workflowPolicy}
          onRefresh={() => {
            loadOrders()
            void work.refresh()
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shown.map((order) => (
            <CoordinatorOrderCard key={order.id} order={order} policy={policy} onOpen={openModal} work={workOf.get(order.id)} now={now} workflowPolicy={workflowPolicy} />
          ))}
        </div>
      )}
      {board.data?.truncated && (
        <p role="status" className="text-center text-caption text-warning-text">Có quá nhiều đơn — chọn một ngày giao để xem đủ.</p>
      )}
      {board.error && <p role="alert" className="text-center text-caption text-danger">{board.error.message}</p>}

      {/* Modal overlay */}
      {modal.type === "detail" && (
        <BrochureOrderDetailModal
          target={{
            orderId: modal.order.id,
            orderCode: modal.order.code,
            sendCode: modal.order.greeting_sessions[0]?.send_code,
            // Đơn ngoài phạm vi bảng theo dõi (đơn xong quá 7 ngày, vượt giới hạn) → đọc khách từ chính đơn
            customerName: workOf.get(modal.order.id)?.customerName ?? (modal.order.customer?.name || modal.order.delivery_address?.recipientName),
            customerPhone: workOf.get(modal.order.id)?.customerPhone ?? (modal.order.customer?.phone || modal.order.delivery_address?.phone),
            saleId: workOf.get(modal.order.id)?.saleId ?? modal.order.saleId,
            saleName: workOf.get(modal.order.id)?.saleName ?? modal.order.saleName,
            coordinatorId: workOf.get(modal.order.id)?.coordinatorId ?? modal.order.coordinatorId,
            coordinatorName: workOf.get(modal.order.id)?.coordinatorName ?? modal.order.coordinatorName,
            recipientName: modal.order.delivery_address?.recipientName,
            recipientPhone: modal.order.delivery_address?.phone,
            deliveryAddress: modal.order.delivery_address?.street || [modal.order.delivery_address?.street, modal.order.delivery_address?.notes].filter(Boolean).join(" · "),
            deliveryDate: modal.order.delivery_window?.date,
            deliveryTimeSlot: modal.order.delivery_window?.timeSlot,
            cardMessage: modal.order.card_message,
            productName: modal.order.product.name,
            productImageUrl: modal.order.product.imageUrl,
            flowersSummary: modal.order.product.flowersSummary,
            totalVnd: modal.order.total_vnd,
            paidVnd: modal.order.paid_vnd,
            balanceVnd: Math.max(0, modal.order.total_vnd - modal.order.paid_vnd),
            status: modal.order.status,
            productionStatus: modal.order.production_status,
            deliveryStatus: modal.order.delivery_status,
            paymentProofUrl: workOf.get(modal.order.id)?.paymentProofUrl || modal.order.payment_proof_url,
            paymentProofBalanceUrl: workOf.get(modal.order.id)?.paymentProofBalanceUrl || modal.order.payment_proof_balance_url,
            createdAt: modal.order.created_at,
          }}
          onClose={() => setModal({ type: "none" })}
          onCancellationProposed={() => {
            setModal({ type: "none" })
            loadOrders()
            void work.refresh()
          }}
        />
      )}
      {modal.type !== "none" && modal.type !== "detail" && (
        <CoordinatorActionModal
          key={`${modal.type}:${modal.orderId}`}
          modal={modal}
          allowSkipPhoto={{ "product-photo": canBypassFinishedPhoto(workflowPolicy), "recipient-photo": canBypassDeliveryPhoto(workflowPolicy) }}
          onClose={() => setModal({ type: "none" })}
          onDone={() => {
            setModal({ type: "none" })
            loadOrders()
            void work.refresh()
          }}
        />
      )}
    </div>
  )
}
