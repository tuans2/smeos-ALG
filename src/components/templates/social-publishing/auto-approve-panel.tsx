"use client"

import React from "react"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

export interface AutoApprovePanelProps {
  autoApprove: boolean
  onToggle: () => void
}

export function AutoApprovePanel({ autoApprove, onToggle }: AutoApprovePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-title font-extrabold text-text">Tự duyệt theo thời hạn</div>
        <div className="text-meta text-text-muted mt-0.5">
          Cơ chế tự động phê duyệt bài viết chờ đăng nếu không có can thiệp thủ công
        </div>
      </div>

      <Card className="p-5 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-body font-bold text-text">Công tắc tự duyệt xuất bản</div>
            <div className="mt-1 text-meta text-text-muted">
              Tắt theo mặc định — chỉ ai có quyền Điều hành mới thấy và cấu hình được.
            </div>
          </div>
          <Switch
            checked={autoApprove}
            onCheckedChange={onToggle}
            aria-label="Công tắc tự duyệt xuất bản"
          />
        </div>
      </Card>

      {autoApprove && (
        <div className="rounded-xl bg-warning-bg border border-warning/40 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-warning-text" />
            <div className="text-meta leading-relaxed text-warning-text">
              Bài chờ quá 24 giờ sẽ tự đăng. Đổi giá, khuyến mại, hoặc thông tin có tính pháp lý/y tế
              không bao giờ tự đăng dù bật công tắc này (tuân thủ luật an toàn Aegis & Cẩm nang hệ thống).
            </div>
          </div>
        </div>
      )}
      <div className="text-caption text-text-muted italic">
        Mỗi lần bật/tắt công tắc đều được ghi vào nhật ký kiểm toán (Audit Log).
      </div>
    </div>
  )
}
