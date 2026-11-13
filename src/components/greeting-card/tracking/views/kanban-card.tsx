"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useEffect, useCallback } from "react"
import { Clock, UserCheck, Sparkles, Copy, Check, Eye, ChevronDown, ChevronRight, EyeOff, RotateCcw, Timer } from "@/components/ui/icons"
import type { TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import type { OrderTimeTier } from "@/modules/greeting-card/domain/order-time-tier"
import { remainingDismissalMs } from "@/modules/greeting-card/domain/dismissal-policy"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { formatStaffCode, getStaffColor } from "@/components/greeting-card/staff-nametag"
import { SlaBadge, vnd } from "./tracking-bits"

interface KanbanCardProps {
  item: TrackingViewItem
  tier: OrderTimeTier
  onOpen: (item: TrackingViewItem) => void
  /** Có quyền phê duyệt/từ chối không (Điều hành / Admin) */
  canDecide?: boolean
  onDismiss?: (item: TrackingViewItem) => void
  onDecide?: (item: TrackingViewItem, approve: boolean) => void
  onRestore?: (item: TrackingViewItem) => void
  defaultCollapsed?: boolean | undefined
}

/** Định dạng MM:SS còn lại từ milliseconds */
function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00"
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

import { useSession } from "@/lib/session"
import { getIndustryOrderTerms, getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

/** Thẻ đơn hàng/phiên trong Kanban: trực quan, tối giản, hỗ trợ thu gọn riêng từng đơn. */
export function KanbanCard({
  item,
  tier,
  onOpen,
  canDecide = false,
  onDismiss,
  onDecide,
  onRestore,
  defaultCollapsed = false,
}: KanbanCardProps) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [copied, setCopied] = useState(false)
  // Đếm ngược tự duyệt (5 phút): chỉ đồng hồ đổi trong effect, số còn lại tính khi render
  const pendingAt = item.dismissal?.status === "PENDING" ? item.dismissal.proposedAt : null
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!pendingAt) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [pendingAt])
  const countdown = pendingAt ? fmtCountdown(remainingDismissalMs(pendingAt, nowMs)) : null

  const handleCopyLink = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!item.sendCode) return
    const url = `${window.location.origin}/b/${encodeURIComponent(item.sendCode)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Bỏ qua lỗi trình duyệt không hỗ trợ clipboard
    }
  }, [item.sendCode])

  const toggleCollapse = (e: React.MouseEvent) => { e.stopPropagation(); setCollapsed((p) => !p) }

  // Tên hiển thị khách hàng
  const isAnonymousSession = item.type === "SESSION" && (!item.customerName || item.customerName === "Khách đang xem mẫu")
  const displayCustomerName = isAnonymousSession ? "Khách đang xem" : item.customerName

  // Mã định danh rút gọn
  const displayCode = item.orderCode ? `#${item.orderCode}` : `#${item.sendCode}`

  // Màu nhân viên phụ trách (Sale ID → palette R1)
  const saleColorRaw = getStaffColor(item.saleId ?? undefined)
  const saleColor = { bg: saleColorRaw?.bg ?? "bg-surface-alt", border: saleColorRaw?.border ?? "border-border", text: saleColorRaw?.text ?? "text-text-muted" }

  // Viền và nền thẻ theo tầng thời gian / trạng thái
  let tierStyle = "border-border bg-surface hover:border-primary/60"
  if (item.isCancelled) {
    tierStyle = "border-border/50 bg-surface opacity-60"
  } else if (tier === "OVERDUE") {
    tierStyle = "border-l-4 border-l-danger border-danger/50 bg-danger-bg/5 hover:border-danger"
  } else if (tier === "URGENT") {
    tierStyle = "border-l-4 border-l-warning border-warning/60 bg-warning-bg/10 hover:border-warning"
  }

  const isPending = item.dismissal?.status === "PENDING"
  const isDismissed = item.isCancelled || item.dismissal?.status === "APPROVED"

  return (
    <article
      data-focus-key={item.orderId ?? item.sessionId}
      className={`group relative flex flex-col gap-1.5 rounded-xl border p-2 text-left text-caption transition-all hover:shadow-xs ${tierStyle}`}
    >
      {/* HÀNG TIÊU ĐỀ */}
      <div className="flex items-center justify-between gap-1 w-full">
        <div className="flex items-center gap-1 min-w-0">
          <Button variant="ghost"
            type="button"
            onClick={toggleCollapse}
            title={collapsed ? "Mở rộng chi tiết đơn" : "Thu gọn đơn"}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Mở rộng đơn" : "Thu gọn đơn"}
            className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-surface-alt hover:text-text transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
          </Button>

          {isAnonymousSession && <Eye size={12} className="text-primary shrink-0 opacity-70" aria-hidden="true" />}

          <Button variant="ghost"
            type="button"
            onClick={() => onOpen(item)}
            className="text-[length:inherit] h-auto p-0 justify-start gap-0 font-bold text-text truncate text-left hover:text-primary transition-colors cursor-pointer"
          >
            {displayCustomerName}
          </Button>
        </div>

        <span
          className="font-mono text-caption text-text-muted shrink-0"
          title={item.orderCode ? `Mã đơn: ${item.orderCode}` : `Mã link: ${item.sendCode}`}
        >
          {displayCode}
        </span>
      </div>

      {/* BĂNG ĐĂNG DISMISS PENDING */}
      {isPending && countdown !== null && (
        <div className="flex items-center justify-between gap-1 rounded-md bg-warning-bg border border-warning-border px-2 py-1 text-caption">
          <div className="flex items-center gap-1 text-warning-text font-medium">
            <Timer size={11} className="shrink-0" aria-hidden="true" />
            <span>Chờ duyệt hủy hiển thị</span>
            <span className="font-mono font-bold">{countdown}</span>
          </div>
          {canDecide && onDecide && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost"
                type="button"
                onClick={(e) => { e.stopPropagation(); onDecide(item, true) }}
                className="h-auto gap-0 rounded bg-danger px-1.5 py-0.5 text-caption font-bold text-white hover:bg-danger-text transition-colors cursor-pointer"
              >
                Duyệt
              </Button>
              <Button variant="outline"
                type="button"
                onClick={(e) => { e.stopPropagation(); onDecide(item, false) }}
                className="h-auto gap-0 rounded border border-border bg-surface px-1.5 py-0.5 text-caption font-medium text-text-muted hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Từ chối
              </Button>
            </div>
          )}
        </div>
      )}

      {/* BADGE ĐÃ HỦY / ĐÃ BỎ HIỂN THỊ */}
      {isDismissed && (
        <div className="flex items-center justify-between gap-1 rounded-md bg-surface-alt border border-border px-2 py-1 text-caption">
          <span className="text-text-muted font-medium truncate">
            {item.dismissal?.reason || "Đã bỏ hiển thị"}
          </span>
          {onRestore && item.dismissal?.status === "APPROVED" && (
            <Button variant="outline"
              type="button"
              onClick={(e) => { e.stopPropagation(); onRestore(item) }}
              title="Khôi phục đơn vào tiến độ"
              className="h-auto inline-flex items-center gap-0.5 rounded border border-primary-border bg-primary-muted px-1.5 py-0.5 text-caption font-bold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw size={10} aria-hidden="true" />
              Khôi phục
            </Button>
          )}
        </div>
      )}

      {/* CHẾ ĐỘ THU GỌN */}
      {collapsed ? (
        <Button variant="ghost"
          type="button"
          onClick={() => onOpen(item)}
          className="text-[length:inherit] h-auto p-0 font-[inherit] flex items-center justify-between gap-1.5 pt-0.5 text-left w-full cursor-pointer"
        >
          <span className="truncate text-caption text-text-muted">
            {item.productName === "Chưa chốt mẫu" ? "Chưa chốt" : item.productName} ·{" "}
            <strong className="text-primary font-bold">
              {item.totalVnd > 0 ? vnd(item.totalVnd) : "Chờ giá"}
            </strong>
          </span>
          <SlaBadge item={item} compact />
        </Button>
      ) : (
        /* CHẾ ĐỘ ĐẦY ĐỦ */
        <>
          <Button variant="ghost"
            type="button"
            onClick={() => onOpen(item)}
            className="text-[length:inherit] h-auto p-0 justify-start font-[inherit] flex w-full flex-col gap-1.5 text-left cursor-pointer"
          >
            {/* Ảnh sản phẩm / hạng phòng & Giá tiền */}
            <div className="flex items-center gap-2 rounded-lg bg-surface-alt/40 p-1.5 w-full">
              <FlowerImage
                src={item.productImageUrl}
                alt={item.productName || terms.sampleProduct}
                sizes="36px"
                fallback="icon"
                className="h-9 w-9 shrink-0 rounded-md border border-border/70 bg-surface object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text text-caption" title={item.productName}>
                  {item.productName === "Chưa chốt mẫu"
                    ? (isStay ? "Chưa chốt phòng" : `Chưa chốt ${terms.sampleProduct.toLowerCase()}`)
                    : item.productName}
                </p>
                <p className="truncate text-caption">
                  {item.totalVnd > 0 ? (
                    <span className="font-extrabold text-primary">{vnd(item.totalVnd)}</span>
                  ) : (
                    <span className="italic text-text-muted">Chờ báo giá</span>
                  )}
                </p>
              </div>
            </div>

            {/* Mốc hẹn giao / nhận phòng */}
            {(item.deliveryTimeSlot || item.deliveryDate) && (
              <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary w-full">
                <Clock size={11} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isStay ? "Nhận phòng" : "Giao"}: {item.deliveryTimeSlot || "Trong ngày"}{item.deliveryDate ? ` · ${item.deliveryDate}` : ""}
                </span>
              </div>
            )}
          </Button>

          {/* Chân thẻ — 2 hàng để không đè nhau ở cột hẹp: (1) trạng thái thời gian + tác vụ nhanh, (2) người phụ trách */}
          <div className="flex w-full flex-col gap-1 border-t border-border/40 pt-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1 truncate">
                <SlaBadge item={item} compact />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/* Nút sao chép link 1-chạm */}
                {item.sendCode && (
                  <Button variant="outline"
                    type="button"
                    onClick={handleCopyLink}
                    title={copied ? "Đã sao chép link khách!" : "Sao chép link khách"}
                    aria-label="Sao chép link khách"
                    className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer hover:bg-surface"
                  >
                    {copied ? <Check size={12} className="text-success" aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  </Button>
                )}

                {/* Nút Bỏ hiển thị (chỉ khi đơn còn active và chưa dismiss) */}
                {!isDismissed && !isPending && onDismiss && (
                  <Button variant="outline"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDismiss(item) }}
                    title="Bỏ hiển thị đơn này"
                    aria-label="Bỏ hiển thị đơn"
                    className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-text-muted hover:border-danger hover:text-danger transition-colors cursor-pointer hover:bg-surface"
                  >
                    <EyeOff size={12} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {/* Tag Sale phụ trách — màu nhận diện theo ID */}
              <span
                className={`inline-flex min-w-0 max-w-full items-center gap-0.5 rounded border px-1.5 py-0.5 text-caption font-medium ${saleColor.bg} ${saleColor.border} ${saleColor.text}`}
                title={`Sale: ${item.saleName || "Chưa gán"} (${formatStaffCode(item.saleId ?? undefined)})`}
              >
                <UserCheck size={10} className="shrink-0" aria-hidden="true" />
                <span className="truncate font-bold">
                  {item.saleName || formatStaffCode(item.saleId ?? undefined)}
                </span>
              </span>

              {/* Tag Điều phối (nếu có) */}
              {item.coordinatorName && (
                <span
                  className="inline-flex min-w-0 max-w-full items-center gap-0.5 rounded bg-info-bg border border-info-border px-1.5 py-0.5 text-caption font-medium text-info-text"
                  title={`Điều phối: ${item.coordinatorName}`}
                >
                  <Sparkles size={10} className="shrink-0" aria-hidden="true" />
                  <span className="truncate font-bold">{item.coordinatorName}</span>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </article>
  )
}
