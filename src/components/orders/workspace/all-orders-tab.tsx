"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { OrderGuidanceCard } from "@/components/templates/orders/order-guidance-card"
import { OrderCard, type OrderItemCardProps } from "@/components/orders/order-card"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

type MobileFilter = "all" | "new" | "arranging" | "delivery" | "finished"

/**
 * Tab "Tất cả" của mục Đơn hàng — bảng kanban 4 cột (máy tính) / danh sách lọc theo trạng thái (điện thoại).
 * Tách nguyên vẹn từ `src/app/(app)/don-hang/page.tsx` (Đơn hàng đa nguồn P4, 31/10/2026) — không đổi hành vi.
 */
export function AllOrdersTab({
  orders,
  onSelect,
  onCreate,
}: {
  orders: OrderItemCardProps[]
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  const { t, ti, dict } = useI18n()
  const [search, setSearch] = useState("")
  const [mobileTab, setMobileTab] = useState<MobileFilter>("all")

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      o.code.toLowerCase().includes(q) ||
      o.deliveryAddress?.recipientName?.toLowerCase().includes(q) ||
      o.deliveryAddress?.phone?.includes(q) ||
      o.items?.some((it) => it.description.toLowerCase().includes(q))
    )
  })

  // Phân nhóm 4 cột Kanban
  const colNew = filteredOrders.filter((o) => o.status === "DRAFT" || o.status === "CONFIRMED")
  const colArranging = filteredOrders.filter(
    (o) =>
      o.status === "PROCESSING" &&
      (o.productionStatus === "WAITING" || o.productionStatus === "ASSIGNED" || o.productionStatus === "ARRANGING")
  )
  const colDelivery = filteredOrders.filter(
    (o) =>
      (o.productionStatus === "READY" || o.deliveryStatus === "DISPATCHED" || o.deliveryStatus === "DELIVERING") &&
      o.status !== "COMPLETED" &&
      o.status !== "CANCELLED"
  )
  const colCompleted = filteredOrders.filter(
    (o) => o.status === "COMPLETED" || o.status === "CANCELLED" || o.deliveryStatus === "DELIVERED"
  )

  const mobileOrders =
    mobileTab === "new"
      ? colNew
      : mobileTab === "arranging"
      ? colArranging
      : mobileTab === "delivery"
      ? colDelivery
      : mobileTab === "finished"
      ? colCompleted
      : filteredOrders

  return (
    <>
      <OrderGuidanceCard />

      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            type="text"
            placeholder={t("orders.filters.searchPlaceholder")}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-caption text-text-muted">
          <span className="font-bold text-text">{filteredOrders.length}</span> {t("common.terms.order").toLowerCase()}
        </div>
      </div>

      {/* Bộ lọc trạng thái trên Mobile (< lg) */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-1 text-caption scrollbar-none [scrollbar-width:none]">
        {[
          { id: "all" as const, label: t("orders.filters.mobile.all"), count: filteredOrders.length },
          { id: "new" as const, label: t("orders.filters.mobile.new"), count: colNew.length },
          { id: "arranging" as const, label: ti("makerAction") ? `Đang ${ti("makerAction").toLowerCase()}` : t("orders.filters.mobile.arranging"), count: colArranging.length },
          { id: "delivery" as const, label: t("orders.filters.mobile.delivering"), count: colDelivery.length },
          { id: "finished" as const, label: t("orders.filters.mobile.completed"), count: colCompleted.length },
        ].map((tab) => (
          <Button variant="ghost"
            type="button"
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer shrink-0 flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-1 font-semibold whitespace-nowrap transition-colors ${
              mobileTab === tab.id
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-muted hover:bg-surface-alt"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-caption rounded-full px-1.5 py-0.2 ${
                mobileTab === tab.id ? "bg-white/20 text-white" : "bg-surface-alt text-text"
              }`}
            >
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {/* Chế độ danh sách đơn trên Mobile (< lg) */}
      <div className="flex flex-col gap-3 lg:hidden">
        {mobileOrders.length === 0 ? (
          <EmptyState
            title={dict.orders.empty.title}
            reason={dict.orders.empty.reason}
            action={{
              label: dict.orders.empty.action,
              onClick: onCreate,
            }}
          />
        ) : (
          mobileOrders.map((ord) => (
            <OrderCard key={ord.id} order={ord} onSelect={() => onSelect(ord.id)} />
          ))
        )}
      </div>

      {/* Chế độ Kanban Board 4 cột trên Desktop (lg+) */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        <div className="flex flex-col rounded-2xl bg-surface-alt/50 p-3 ring-1 ring-inset ring-border/60">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-info" aria-hidden="true" />
              <span className="text-body-sm font-bold text-text">{t("orders.columns.newOrders")}</span>
            </div>
            <Badge tone="neutral" className="text-caption font-bold">
              {colNew.length}
            </Badge>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {colNew.map((ord) => (
              <OrderCard key={ord.id} order={ord} onSelect={() => onSelect(ord.id)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl bg-surface-alt/50 p-3 ring-1 ring-inset ring-border/60">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-body-sm font-bold text-text">
                {ti("makerAction") ? `Đang ${ti("makerAction").toLowerCase()}` : t("orders.columns.inProduction")}
              </span>
            </div>
            <Badge tone="neutral" className="text-caption font-bold">
              {colArranging.length}
            </Badge>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {colArranging.map((ord) => (
              <OrderCard key={ord.id} order={ord} onSelect={() => onSelect(ord.id)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl bg-surface-alt/50 p-3 ring-1 ring-inset ring-border/60">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" aria-hidden="true" />
              <span className="text-body-sm font-bold text-text">{t("orders.columns.outForDelivery")}</span>
            </div>
            <Badge tone="neutral" className="text-caption font-bold">
              {colDelivery.length}
            </Badge>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {colDelivery.map((ord) => (
              <OrderCard key={ord.id} order={ord} onSelect={() => onSelect(ord.id)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl bg-surface-alt/50 p-3 ring-1 ring-inset ring-border/60">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
              <span className="text-body-sm font-bold text-text">{t("orders.columns.delivered")}</span>
            </div>
            <Badge tone="neutral" className="text-caption font-bold">
              {colCompleted.length}
            </Badge>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {colCompleted.map((ord) => (
              <OrderCard key={ord.id} order={ord} onSelect={() => onSelect(ord.id)} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
