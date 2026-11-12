"use client"

import type { ReactNode } from "react"

import { EmptyState } from "@/components/ui/empty-state"
import { useSession } from "@/lib/session"

/**
 * Trang quản trị chỉ mở cho người có một trong các mã quyền `anyOf` (ví dụ Cài đặt tiệm: sửa hồ sơ hoặc điều phối
 * giao hàng). Máy chủ vẫn chặn từng thao tác ghi; khung này để người không có quyền không thấy màn quản trị.
 */
export function RequireCapability({ anyOf, children }: { anyOf: readonly string[]; children: ReactNode }) {
  const { can } = useSession()
  if (anyOf.some((code) => can(code))) return <>{children}</>
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <EmptyState kind="forbidden" title="Bạn chưa có quyền mở trang này" reason="Liên hệ Điều hành cửa hàng nếu bạn cần quản lý mục này." />
    </div>
  )
}
