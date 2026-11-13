"use client"

import { Clock } from "@/components/ui/icon-set/clock"
import { Button } from "@/components/ui/button"

/** Sau khi đăng ký / dùng thử: tài khoản chờ quản trị viên duyệt (PO 22/10/2026). */
export function PendingApprovalNotice({ message, hint, onSwitchToLogin }: { message: string; hint: string; onSwitchToLogin: () => void }) {
  return (
    <div className="flex flex-col gap-4" role="status">
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-warning/15 text-warning-text shrink-0">
          <Clock size={18} />
        </div>
        <div className="text-body-sm">
          <div className="font-bold text-text">Đã gửi đăng ký</div>
          <div className="text-text-muted mt-1 leading-relaxed">{message}</div>
          <div className="text-text-muted text-caption mt-2 leading-relaxed">{hint}</div>
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onSwitchToLogin}>
        Về trang đăng nhập
      </Button>
    </div>
  )
}
