"use client"

import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

export type PendingOptimization = {
  job_id: string
  result: string | null
  completed_at: string | null
  requires_warning: boolean
}

function dinhDangGio(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("vi-VN")
}

export function OptimizationsApprovalPanel({
  optimizations,
  dangDuyet,
  onApprove,
  onNavigateStudio,
}: {
  optimizations: PendingOptimization[]
  dangDuyet: string | null
  onApprove: (jobId: string, requiresWarning: boolean) => Promise<void>
  /** Không có khi trang Sáng tạo không thuộc giai đoạn bàn giao — ẩn nút. */
  onNavigateStudio?: (() => void) | undefined
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-body font-bold">Ảnh tối ưu chờ duyệt ({optimizations.length})</div>
      {optimizations.length === 0 ? (
        <EmptyState
          title="Không có ảnh tối ưu nào chờ duyệt"
          reason="Không có tác vụ xử lý tối ưu ảnh nào đang chờ duyệt."
          action={onNavigateStudio ? { label: "Tới Creative Studio", onClick: onNavigateStudio } : undefined}
        />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {optimizations.map((o) => (
            <div key={o.job_id} className="flex min-h-11 items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {o.requires_warning ? (
                  <AlertTriangle size={18} strokeWidth={1.9} className="flex-shrink-0 text-warning-text" />
                ) : (
                  <CheckCircle2 size={18} strokeWidth={1.8} className="flex-shrink-0 text-secondary" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-body-sm font-semibold">Job #{o.job_id.slice(0, 8)}</div>
                  <div className="truncate text-caption text-text-muted">
                    {o.result ?? "—"} · {dinhDangGio(o.completed_at)}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={o.requires_warning ? "warning" : "primary"}
                disabled={dangDuyet === o.job_id}
                onClick={() => onApprove(o.job_id, o.requires_warning)}
              >
                {dangDuyet === o.job_id ? "Đang duyệt…" : "Duyệt"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
