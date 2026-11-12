"use client"

import { PageHeader } from "@/components/ui/page-header"
import React from "react"
import { Clock, ExternalLink, Inbox, MapPin, RefreshCw } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"

type Stage = "INVITED" | "GRACE" | "IN_PROGRESS"

interface PortalOrder {
  orderCode: string
  stage: Stage
  deliveryAddress: string
  deliveryTime: string
  subcontractPriceVnd: number | null
  deadlineAt: string | null
  productionStatus: string | null
  cardUrl: string
}

interface PortalResponse {
  data: { branch: { code: string; name: string } | null; orders: PortalOrder[] }
}

/** Đơn mới phải hiện gần như ngay (hạn nhận đơn chỉ vài phút) */
const REFRESH_MS = 30_000

const STAGE_COPY: Record<Stage, { title: string; badge: string; badgeClass: string; action: string }> = {
  INVITED: { title: "Lời mời nhận đơn", badge: "Đang mời", badgeClass: "bg-warning/15 text-warning-text", action: "Xem và nhận đơn" },
  GRACE: { title: "Đã nhận, đang kiểm kho", badge: "Kiểm kho", badgeClass: "bg-primary/10 text-primary", action: "Chốt làm hoặc huỷ" },
  IN_PROGRESS: { title: "Đang làm", badge: "Đang làm", badgeClass: "bg-success-bg text-success", action: "Mở thẻ chế tác" },
}

function minutesLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000))
}

function OrderCard({ order }: { order: PortalOrder }) {
  const copy = STAGE_COPY[order.stage]
  const left = minutesLeft(order.deadlineAt)
  return (
    <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-extrabold text-text">Đơn #{order.orderCode}</span>
        <span className={`px-2 py-0.5 rounded-full text-caption font-bold ${copy.badgeClass}`}>{copy.badge}</span>
      </div>
      <div className="text-body-sm text-text flex items-start gap-1.5">
        <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
        <span>{order.deliveryAddress}</span>
      </div>
      <div className="text-caption text-text-muted flex flex-wrap gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          <Clock size={12} /> Giao: {order.deliveryTime}
        </span>
        {order.subcontractPriceVnd !== null && <span>Thù lao: {order.subcontractPriceVnd.toLocaleString("vi-VN")} đ</span>}
        {left !== null && <span className="font-bold text-warning-text">Còn {left} phút</span>}
      </div>
      <a
        href={order.cardUrl}
        className="self-start mt-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-body-sm font-bold"
      >
        {copy.action} <ExternalLink size={14} />
      </a>
    </div>
  )
}

export function BranchPortalBoard() {
  const { data, isLoading, isValidating, mutate } = useApi<PortalResponse>("/api/v1/branch-portal/orders", {
    refreshInterval: REFRESH_MS,
  })
  const branch = data?.data.branch ?? null
  const orders = data?.data.orders ?? []
  const groups: Stage[] = ["INVITED", "GRACE", "IN_PROGRESS"]

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
      <PageHeader
        title="Đơn gia công"
        description={branch ? branch.name : "Đơn được mời và đơn đang làm của chi nhánh"}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating} className="flex items-center gap-1.5">
            <RefreshCw size={14} className={isValidating ? "animate-spin motion-reduce:animate-none" : ""} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {!isLoading && data && !branch && (
        <p className="text-body-sm text-text-muted">
          Tài khoản của bạn chưa được gắn với chi nhánh nào. Vui lòng nhờ quản lý cửa hàng gắn chi nhánh trong phần Thành viên.
        </p>
      )}

      {branch && orders.length === 0 && !isLoading && (
        <div className="flex flex-col items-center gap-2 py-12 text-text-muted">
          <Inbox size={32} />
          <p className="text-body-sm">Chưa có đơn nào. Đơn mới sẽ tự hiện ở đây.</p>
        </div>
      )}

      {groups.map((stage) => {
        const items = orders.filter((o) => o.stage === stage)
        if (items.length === 0) return null
        return (
          <section key={stage} className="flex flex-col gap-3">
            <h2 className="text-body font-bold text-text">
              {STAGE_COPY[stage].title} ({items.length})
            </h2>
            {items.map((o) => (
              <OrderCard key={o.orderCode} order={o} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
