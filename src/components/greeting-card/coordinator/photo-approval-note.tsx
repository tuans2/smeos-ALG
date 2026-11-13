"use client"

import React from "react"
import { Hourglass } from "@/components/ui/icons"
import type { PhotoApprovalState } from "@/modules/greeting-card/domain/photo-approval"

export type { PhotoApprovalState }

/** Số phút còn chờ khách duyệt ảnh (tính lại theo giờ máy, không đợi tải lại dữ liệu), hoặc `null`. */
export function photoWaitMinutesLeft(approval: PhotoApprovalState | null | undefined, now: number): number | null {
  if (approval?.status !== "PENDING" || !approval.uploadedAt) return null
  const left = new Date(approval.uploadedAt).getTime() + approval.countdownMinutes * 60_000 - now
  return left > 0 ? Math.ceil(left / 60_000) : null
}

/** Lý do chưa giao ship được vì đang chờ khách duyệt ảnh — khớp kiểm tra ở máy chủ. */
export function photoWaitBlocker(approval: PhotoApprovalState | null | undefined, now: number): string | null {
  if (approval?.status === "FEEDBACK") return "Khách đã góp ý ảnh thành phẩm — chỉnh theo góp ý và chụp lại ảnh trước khi giao"
  const minutes = photoWaitMinutesLeft(approval, now)
  return minutes === null ? null : `Đang chờ khách duyệt ảnh thành phẩm — còn ${minutes} phút (hết giờ tự duyệt)`
}

/** Ghi chú đếm ngược trên thẻ đơn để Điều phối biết chờ trước khi giao ship (PO 15/10/2026, mục 4). */
export function PhotoApprovalNote({ approval, now }: { approval: PhotoApprovalState | null | undefined; now: number }) {
  if (approval?.status === "FEEDBACK") {
    return (
      <p className="flex items-center gap-1.5 rounded-lg bg-warning-bg/50 px-2 py-1 text-caption font-semibold text-warning-text">
        <Hourglass size={12} aria-hidden="true" />
        Khách góp ý ảnh — xem ghi chú đơn, chỉnh và chụp lại ảnh
      </p>
    )
  }
  const minutes = photoWaitMinutesLeft(approval, now)
  if (minutes === null) return null
  return (
    <p className="flex items-center gap-1.5 rounded-lg bg-warning-bg/50 px-2 py-1 text-caption font-semibold text-warning-text">
      <Hourglass size={12} aria-hidden="true" />
      Chờ khách duyệt ảnh — còn {minutes} phút, hết giờ tự duyệt
    </p>
  )
}
