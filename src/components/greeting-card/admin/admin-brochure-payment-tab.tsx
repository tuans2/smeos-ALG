"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { RefreshCw, Settings, ShieldCheck, Search, X } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi, usePagedList } from "@/components/greeting-card/greeting-api"
import { parsePaymentPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { UnmatchedPaymentsPanel } from "./unmatched-payments-panel"
import { AdminOrderTable } from "./admin-order-table"
import { AdminOrderActionDialog } from "./admin-order-action-dialog"
import { ORDER_FILTERS, type ActionResult, type AdminOrder, type AdminOrderDialogAction, type OrderAction, type OrderFilterId } from "./admin-order-types"
import { CopyCustomerMessage } from "./copy-customer-message"
import { PendingCancellationPanel } from "./pending-cancellation-panel"
import { AdminConfirmOrderModal } from "@/components/greeting-card/coordinator/admin-confirm-order-modal"
import { EMPTY_ORDER_FILTER, OrderAdvancedFilters, orderFilterQuery } from "@/components/orders/order-advanced-filters"
import Link from "next/link"
import type { Route } from "next"

/** Tab Điều hành: việc cần chủ tiệm quyết (thu tiền, báo giá, tiền chưa khớp); cài đặt nằm trong ngăn riêng. */
export function AdminBrochurePaymentTab({ focusOrderId = null, onClearFocus }: { focusOrderId?: string | null; onClearFocus?: () => void } = {}) {
  const [filter, setFilter] = useState<OrderFilterId>("outstanding")
  const [action, setAction] = useState<OrderAction | null>(null)
  const [notice, setNotice] = useState<ActionResult | null>(null)
  const [search, setSearch] = useState("")
  const [advanced, setAdvanced] = useState(EMPTY_ORDER_FILTER)
  // Tìm theo tên khách / mã đơn / mã link / SĐT khách bỏ qua bộ lọc — để đối chiếu nhanh
  const term = search.trim()
  // Mở từ Hộp việc: chỉ hiện đúng đơn đó, bất kể bộ lọc đang chọn (trước đây lọc "Còn phải thu" che mất đơn)
  const query = focusOrderId
    ? `orderId=${encodeURIComponent(focusOrderId)}`
    : term.length >= 1 ? `q=${encodeURIComponent(term)}` : ORDER_FILTERS.find((f) => f.id === filter)?.query ?? ""
  const fullQuery = [query, focusOrderId ? "" : orderFilterQuery(advanced)].filter(Boolean).join("&")
  const orders = usePagedList<AdminOrder>(`/api/v1/greeting-card/orders${fullQuery ? `?${fullQuery}` : ""}`)
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const policy = parsePaymentPolicy(org.data?.settings)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-title font-extrabold text-text flex items-center gap-2">
            <span>Việc chờ bạn quyết</span>
          </h2>
          <p className="text-body-sm text-text-muted mt-1">
            Đối chiếu tiền khách chuyển với giá bán rồi xác nhận, báo giá mẫu chưa niêm yết, huỷ đơn và hoàn tiền
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={"/cai-dat?tab=BROCHURE_FLOW" as Route}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border bg-bg text-caption font-bold text-text hover:bg-surface-alt transition-colors"
          >
            <Settings size={14} aria-hidden="true" />
            <span>Cài đặt</span>
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => void orders.refresh()} className="gap-1.5 text-caption h-9">
            <RefreshCw size={14} className={orders.isLoading ? "animate-spin motion-reduce:animate-none" : ""} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      <UnmatchedPaymentsPanel />

      <PendingCancellationPanel />

      {notice && (
        <div role="status" className="p-3.5 rounded-xl bg-success-bg border border-success/30 text-success text-body-sm font-bold flex items-center gap-2">
          <ShieldCheck size={20} />
          <span className="flex-1">{notice.message}</span>
          {notice.customerMessage && <CopyCustomerMessage text={notice.customerMessage} />}
        </div>
      )}

      <section className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {focusOrderId && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-2.5 text-body-sm">
            <span className="font-semibold text-text">Đang mở đơn từ Hộp việc</span>
            <Button variant="ghost" type="button" onClick={onClearFocus} className="px-0 py-0 text-[length:inherit] gap-0 min-h-9 font-semibold text-primary hover:underline">Xem tất cả đơn</Button>
          </div>
        )}
        {!focusOrderId && (
          <div className="px-4 pt-4">
            <OrderAdvancedFilters value={advanced} onChange={setAdvanced} />
          </div>
        )}
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-2" role="group" aria-label="Lọc đơn">
          {ORDER_FILTERS.map((f) => (
            <Button variant="outline"
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => { setFilter(f.id); onClearFocus?.() }}
              className={`py-0 gap-0 px-3 h-8 rounded-lg text-caption font-bold border ${
                filter === f.id ? "bg-primary text-white border-primary hover:bg-primary" : "border-border text-text-muted hover:bg-surface-alt"
              }`}
            >
              {f.label}
            </Button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Tìm kiếm đơn hàng theo tên khách, mã đơn, số điện thoại"
              placeholder="Tìm tên khách, mã đơn, SĐT…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); onClearFocus?.() }}
              className="h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-7 text-caption text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden"
            />
            {search && (
              <Button variant="ghost"
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setSearch("")}
                className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={12} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        {orders.error ? (
          <p role="alert" className="p-4 text-body-sm text-danger">{orders.error.message}</p>
        ) : orders.isLoading ? (
          <div className="p-4 flex flex-col gap-2" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" />)}
          </div>
        ) : orders.items.length === 0 ? (
          <p className="p-8 text-center text-body-sm text-text-muted">Không có đơn nào trong mục này.</p>
        ) : (
          <>
            <AdminOrderTable orders={orders.items} onAction={setAction} shopDepositPercent={policy.depositPercent} policy={policy} />
            {orders.hasMore && (
              <div className="p-3 border-t border-border flex justify-center">
                <Button type="button" variant="outline" size="sm" disabled={orders.isLoadingMore} onClick={() => void orders.loadMore()}>
                  {orders.isLoadingMore ? "Đang tải..." : "Tải thêm đơn"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {action && (action.type === "confirm-order" || action.type === "reject-order") && (
        <AdminConfirmOrderModal
          mode={action.type === "confirm-order" ? "confirm" : "reject"}
          orderId={action.order.id}
          orderCode={action.order.code}
          onClose={() => setAction(null)}
          onDone={() => {
            const isConfirm = action.type === "confirm-order"
            setAction(null)
            setNotice({
              message: isConfirm
                ? `Đã xác nhận đơn hàng ${action.order.code}. Đơn đã chuyển vào sản xuất.`
                : `Đã từ chối đơn hàng ${action.order.code} và kích hoạt quy trình hoàn tiền.`,
            })
            void orders.refresh()
          }}
        />
      )}
      {action && action.type !== "confirm-order" && action.type !== "reject-order" && (
        <AdminOrderActionDialog
          action={action as AdminOrderDialogAction}
          policy={policy}
          onClose={() => setAction(null)}
          onDone={(result) => {
            setAction(null)
            setNotice(result)
            void orders.refresh()
          }}
        />
      )}
    </div>
  )
}
