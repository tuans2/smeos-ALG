import * as React from "react"
import { Lock } from "@/components/ui/icon-set/lock"
import { cn } from "@/lib/utils"

export interface EntitlementGateProps {
  /** Kết quả kiểm tra capability/gói từ server — không tự suy từ vai trò ở client. */
  allowed: boolean
  /** Lý do bằng ngôn ngữ nghiệp vụ: "Cần quyền quản lý đơn hàng", "Có trong gói Chuyên nghiệp". */
  reason: string
  /** Đường đi tiếp: xin quyền hoặc nâng gói. */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Chức năng ngoài quyền/gói không biến mất âm thầm (03c UX-018, UX-P11).
 * Không dùng cho tài nguyên của tổ chức khác — trường hợp đó server trả 404.
 */
export function EntitlementGate({ allowed, reason, action, children, className }: EntitlementGateProps) {
  if (allowed) return <>{children}</>
  return (
    <div
      role="note"
      className={cn("flex items-start gap-2.5 rounded-xl border border-border bg-surface-alt px-3.5 py-3 text-body-sm text-text-muted", className)}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text">Chưa dùng được</p>
        <p className="mt-0.5">{reason}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
