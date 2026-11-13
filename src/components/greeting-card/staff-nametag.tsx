"use client"

import React from "react"
import { UserCheck, Sparkles } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { TrackingPipelineStepId } from "@/modules/greeting-card/domain/tracking-pipeline-types"

/**
 * Định dạng mã nhân viên từ ID người dùng.
 * Rút gọn ID thành chuỗi hexa 6 ký tự viết hoa dễ nhận diện: NV-XXXXXX
 */
export function formatStaffCode(id: string | null | undefined): string {
  if (!id) return "—"
  if (id === "public") return "CHUNG"
  const clean = id.replace(/[^a-zA-Z0-9]/g, "")
  const short = clean.length > 6 ? clean.slice(0, 6).toUpperCase() : clean.toUpperCase()
  return `NV-${short}`
}

/** Bảng màu nhận diện nhân viên — 6 tông `--color-tone-*` (PO 05/11/2026; thay 12 thang màu cũ đã xoá) */
const STAFF_COLOR_PALETTE = [
  { bg: "bg-tone-indigo/10", border: "border-tone-indigo/30", text: "text-tone-indigo", badge: "bg-tone-indigo" },
  { bg: "bg-tone-blue/10", border: "border-tone-blue/30", text: "text-tone-blue", badge: "bg-tone-blue" },
  { bg: "bg-tone-teal/10", border: "border-tone-teal/30", text: "text-tone-teal", badge: "bg-tone-teal" },
  { bg: "bg-tone-green/10", border: "border-tone-green/30", text: "text-tone-green", badge: "bg-tone-green" },
  { bg: "bg-tone-amber/10", border: "border-tone-amber/30", text: "text-tone-amber", badge: "bg-tone-amber" },
  { bg: "bg-tone-rose/10", border: "border-tone-rose/30", text: "text-tone-rose", badge: "bg-tone-rose" },
] as const

/** Hash đơn giản (FNV-1a 32-bit) để ánh xạ ID → chỉ số màu xác định */
function hashToIndex(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h % STAFF_COLOR_PALETTE.length
}

/**
 * Trả về bộ class màu nhận diện nhân viên cho một ID.
 * Cùng ID luôn ra cùng màu; nhân viên nhìn vào màu nhận ngay đơn của mình.
 */
export function getStaffColor(id: string | null | undefined) {
  if (!id || id === "public") return STAFF_COLOR_PALETTE[0]
  return STAFF_COLOR_PALETTE[hashToIndex(id)]
}

/**
 * Xác định đơn hàng/thẻ đang ở giai đoạn Điều phối hay giai đoạn Bán hàng.
 * - Giai đoạn Điều phối: từ bước 6 trở đi (Chế tác, QC, Giao hàng, Hoàn tất) hoặc
 *   khi sản xuất/giao hàng đã được kích hoạt.
 * - Giai đoạn Bán hàng: mở link, chọn mẫu, điền form, chờ thanh toán, xác nhận TT (bước 1–5).
 */
export function isCoordinationStage(target?: {
  currentStepId?: TrackingPipelineStepId | string | null | undefined
  productionStatus?: string | null | undefined
  deliveryStatus?: string | null | undefined
  type?: string | null | undefined
} | null): boolean {
  if (!target) return false
  if (target.type === "SESSION") return false

  const coordSteps = ["STEP_6_ARRANGING", "STEP_7_READY_QC", "STEP_8_DELIVERING", "STEP_9_COMPLETED"]
  if (target.currentStepId && coordSteps.includes(target.currentStepId)) {
    return true
  }

  const activeProd = ["ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY", "DONE"]
  if (target.productionStatus && activeProd.includes(target.productionStatus)) {
    return true
  }

  const activeShip = ["DISPATCHED", "DELIVERING", "DELIVERED", "FAILED"]
  if (target.deliveryStatus && activeShip.includes(target.deliveryStatus)) {
    return true
  }

  return false
}

interface StaffNametagProps {
  role: "SALE" | "COORDINATOR"
  id?: string | null | undefined
  name?: string | null | undefined
  compact?: boolean
  className?: string | undefined
}

/**
 * Nametag nhân viên nổi bật (Sale / Điều phối):
 * - Huy hiệu vai trò nổi bật
 * - Mã nhân viên (font monospace, đậm)
 * - Tên nhân viên phụ trách
 */
export function StaffNametag({ role, id, name, compact = false, className }: StaffNametagProps) {
  const isSale = role === "SALE"
  const staffCode = formatStaffCode(id)
  const staffName = name || (isSale ? "Chưa gán" : "Chưa chỉ định")

  if (isSale) {
    return (
      <span
        title={`Nhân sự Bán hàng: ${staffName} (${staffCode})`}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-primary-border bg-primary-muted px-1.5 py-0.5 text-caption font-medium shadow-2xs select-none",
          className,
        )}
      >
        <span className="inline-flex items-center gap-0.5 rounded bg-primary px-1 py-0.5 text-caption font-extrabold uppercase tracking-wider text-white">
          <UserCheck size={10} aria-hidden="true" />
          <span>Sale</span>
        </span>
        <span className="font-mono font-black text-primary text-caption tracking-tight">{staffCode}</span>
        {!compact && (
          <span className="max-w-[110px] truncate font-bold text-text text-caption">{staffName}</span>
        )}
      </span>
    )
  }

  return (
    <span
      title={`Nhân sự Điều phối: ${staffName} (${staffCode})`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-info-border bg-info-bg px-1.5 py-0.5 text-caption font-medium shadow-2xs select-none",
        className,
      )}
    >
      <span className="inline-flex items-center gap-0.5 rounded bg-info px-1 py-0.5 text-caption font-extrabold uppercase tracking-wider text-white">
        <Sparkles size={10} aria-hidden="true" />
        <span>Điều phối</span>
      </span>
      <span className="font-mono font-black text-info-text text-caption tracking-tight">{staffCode}</span>
      {!compact && (
        <span className="max-w-[110px] truncate font-bold text-text text-caption">{staffName}</span>
      )}
    </span>
  )
}

export interface StaffNametagItem {
  currentStepId?: TrackingPipelineStepId | string | null | undefined
  productionStatus?: string | null | undefined
  deliveryStatus?: string | null | undefined
  type?: string | null | undefined
  saleId?: string | null | undefined
  saleName?: string | null | undefined
  coordinatorId?: string | null | undefined
  coordinatorName?: string | null | undefined
}

export interface StaffNametagGroupProps {
  item?: StaffNametagItem | null | undefined
  fallbackSaleName?: string | null | undefined
  fallbackSaleId?: string | null | undefined
  fallbackCoordinatorName?: string | null | undefined
  fallbackCoordinatorId?: string | null | undefined
  forceStage?: "sale" | "coordinator" | undefined
  compact?: boolean
  className?: string | undefined
}

/**
 * Cụm Nametag nhân viên theo đúng quy chuẩn nghiệp vụ:
 * - Ở giai đoạn Bán hàng: hiển thị Nametag Sale
 * - Ở giai đoạn Điều phối: hiển thị CẢ HAI: Nametag Điều phối VÀ Nametag Sale
 */
export function StaffNametagGroup({
  item,
  fallbackSaleName,
  fallbackSaleId,
  fallbackCoordinatorName,
  fallbackCoordinatorId,
  forceStage,
  compact = false,
  className,
}: StaffNametagGroupProps) {
  const saleId = item?.saleId ?? fallbackSaleId ?? null
  const saleName = item?.saleName ?? fallbackSaleName ?? null
  const coordinatorId = item?.coordinatorId ?? fallbackCoordinatorId ?? null
  const coordinatorName = item?.coordinatorName ?? fallbackCoordinatorName ?? null

  const isCoord = forceStage === "coordinator" || (forceStage !== "sale" && isCoordinationStage(item))

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {isCoord && (
        <StaffNametag
          role="COORDINATOR"
          id={coordinatorId}
          name={coordinatorName}
          compact={compact}
        />
      )}
      <StaffNametag
        role="SALE"
        id={saleId}
        name={saleName}
        compact={compact}
      />
    </div>
  )
}
