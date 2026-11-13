import * as React from "react"
import Link from "next/link"
import { Package } from "@/components/ui/icon-set/package"
import { Search } from "@/components/ui/icon-set/search"
import { Lock } from "@/components/ui/icon-set/lock"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type EmptyStateKind = "none" | "filtered" | "forbidden" | "error"

export interface EmptyStateProps {
  kind?: EmptyStateKind | undefined
  title?: string | undefined
  reason?: string | undefined
  action?: {
    label: string
    onClick?: (() => void) | undefined
    href?: string | undefined
  } | undefined
  icon?: React.ComponentType<{ size?: number; className?: string; weight?: "regular" | "duotone" | "fill" }> | undefined
  className?: string | undefined
}

export function EmptyState({
  kind = "none",
  title,
  reason,
  action,
  icon: CustomIcon,
  className,
}: EmptyStateProps) {
  const defaults = {
    none: {
      icon: Package,
      title: "Chưa có dữ liệu",
      reason: "Bắt đầu tạo bản ghi đầu tiên của bạn.",
      tone: "bg-primary-muted text-primary",
    },
    filtered: {
      icon: Search,
      title: "Không tìm thấy kết quả",
      reason: "Thử thay đổi từ khoá tìm kiếm hoặc đặt lại các bộ lọc hiện tại.",
      tone: "bg-surface-alt text-text-muted",
    },
    forbidden: {
      icon: Lock,
      title: "Không có quyền truy cập",
      reason: "Tài khoản của bạn chưa được cấp quyền để xem dữ liệu này.",
      tone: "bg-warning-bg text-warning-text",
    },
    error: {
      icon: AlertCircle,
      title: "Không thể nạp dữ liệu",
      reason: "Đã xảy ra lỗi trong quá trình tải. Vui lòng thử lại sau.",
      tone: "bg-danger-bg text-danger-text",
    },
  }[kind]

  const DisplayIcon = CustomIcon || defaults.icon
  const displayTitle = title || defaults.title
  const displayReason = reason !== undefined ? reason : defaults.reason

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-8 text-center rounded-2xl border border-dashed border-border/80 bg-surface/50",
        className
      )}
    >
      <div
        className={cn(
          "mb-1 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/5",
          defaults.tone
        )}
      >
        <DisplayIcon size={24} weight="duotone" aria-hidden="true" />
      </div>
      <div className="text-title-sm font-bold text-text">{displayTitle}</div>
      {displayReason && (
        <p className="text-body-sm text-text-muted max-w-sm leading-relaxed">{displayReason}</p>
      )}
      {action && (
        <div className="mt-2">
          {action.href ? (
            <Button asChild size="sm" variant="outline" aria-label={action.label}>
              <Link href={action.href as never}>{action.label}</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
