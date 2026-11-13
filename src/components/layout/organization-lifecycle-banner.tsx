"use client"

import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { useSession } from "@/lib/session"
import { lifecycleBanner } from "@/modules/organization/domain/organization-lifecycle"

const TONE_CLASS = {
  danger: "border-danger/30 bg-danger-bg text-danger-text",
  warning: "border-warning/30 bg-warning-bg text-warning-text",
} as const

/**
 * Banner đầu trang khi tổ chức tạm ngưng / đang rời nền tảng (audit User Journey UJ-26, PO 12/11/2026 UQ13): trước
 * đây người dùng chỉ gặp lỗi rời rạc ở từng nút bấm mà không biết vì sao.
 */
export function OrganizationLifecycleBanner() {
  const session = useSession()
  const banner = lifecycleBanner(session.organization?.lifecycleStatus)
  if (!banner) return null
  return (
    <div role="status" className={`m-3 flex items-start gap-2 rounded-xl border p-3 text-body-sm font-medium md:mx-6 ${TONE_CLASS[banner.tone]}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{banner.message}</span>
    </div>
  )
}
